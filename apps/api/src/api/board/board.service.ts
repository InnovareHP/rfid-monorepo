import { formatPhoneNumber } from "@dashboard/shared";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Board, BoardFieldType, ModuleType, Prisma } from "@prisma/client";
import { Queue, QueueEvents } from "bullmq";
import { appConfig } from "src/config/app-config";
import { aiGenerateVision } from "src/lib/aws/ai-guard";
import { businessCardScanPrompt, followUpPrompt } from "src/lib/aws/prompts";
import {
  cacheData,
  deleteData,
  getData,
  purgeAllCacheKeys,
} from "src/lib/redis/redis";
import { v4 as uuidv4 } from "uuid";
import { lookupByName } from "zipcodes-perogi";
import { CACHE_PREFIX } from "../../lib/constant";
import { prisma } from "../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { FaxService } from "../fax/fax.service";
import { BoardGateway } from "./board.gateway";
import { UpdateContactDto } from "./dto/board.schema";
import { EmailDispatchService } from "./email-dispatch.service";

// Trailing window that marks a record as an active partner
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

interface BoardFilters {
  filter?: Record<string, string>;
  boardDateFrom?: string;
  boardDateTo?: string;
  page?: number;
  limit?: number;
  search?: string;
  moduleType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface HistoryFilters {
  page?: number;
  limit?: number;
  moduleType: string;
}

type RecordUpdateContext = {
  recordId: string;
  value: string;
  organizationId: string;
  memberId: string;
  moduleType: string;
  reason?: string;
};

type FieldUpdateContext = RecordUpdateContext & {
  field: { id: string; fieldType: BoardFieldType; fieldName: string };
};

@Injectable()
export class BoardService {
  private readonly geminiQueueEvents: QueueEvents;

  constructor(
    private readonly boardGateway: BoardGateway,
    private readonly emailDispatchService: EmailDispatchService,
    private readonly faxService: FaxService,
    @InjectQueue(QUEUE_NAMES.BULK_EMAIL)
    private readonly bulkEmailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CSV_IMPORT)
    private readonly csvImportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.GEMINI)
    private readonly geminiQueue: Queue
  ) {
    this.geminiQueueEvents = new QueueEvents(QUEUE_NAMES.GEMINI, {
      connection: { url: appConfig.REDIS_URL },
    });
  }
  async getAllBoards(organizationId: string, filters: BoardFilters) {
    const {
      boardDateFrom,
      boardDateTo,
      page = 1,
      limit = 50,
      filter,
      search,
      moduleType,
      sortBy,
      sortOrder = "asc",
    } = filters;

    const cachedData = await getData(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:${boardDateFrom}:${boardDateTo}:${page}:${limit}:${search}:${sortBy}:${sortOrder}:${JSON.stringify(filter)}`
    );

    if (cachedData) {
      return cachedData;
    }

    const offset = (page - 1) * Number(limit);

    const where: Prisma.BoardWhereInput = {
      organizationId: organizationId,
      isDeleted: false,
      moduleType: moduleType as ModuleType,
    };

    if (boardDateFrom || boardDateTo) {
      where.createdAt = {
        ...(boardDateFrom && { gte: new Date(boardDateFrom) }),
        ...(boardDateTo && { lte: new Date(boardDateTo) }),
      };
    }

    // recordName and FieldValue.value are encrypted at rest, so search,
    // filter, sort and pagination run on decrypted rows here, not in Postgres
    const [allBoards, fields] = await Promise.all([
      prisma.board.findMany({
        where,
        include: {
          values: {
            select: {
              field: {
                select: {
                  fieldName: true,
                  id: true,
                },
              },
              value: true,
            },
          },
          notifications: {
            take: 1,
          },
        },
      }),
      prisma.field.findMany({
        where: {
          organizationId: organizationId,
          moduleType: moduleType as ModuleType,
          isDeleted: false,
        },
        orderBy: { fieldOrder: "asc" },
      }),
    ]);

    // Link fields store the target board id; resolve to names for display
    // and keep the ids so the frontend can navigate to the target record.
    const linkFieldIds = new Set(
      fields.filter((f) => this.isLinkFieldType(f.fieldType)).map((f) => f.id)
    );

    const linkTargetIds = new Set<string>();
    for (const b of allBoards) {
      for (const v of b.values) {
        if (linkFieldIds.has(v.field.id) && v.value) linkTargetIds.add(v.value);
      }
    }

    const linkTargets = linkTargetIds.size
      ? await prisma.board.findMany({
          where: { id: { in: [...linkTargetIds] }, organizationId },
          select: { id: true, recordName: true },
        })
      : [];
    const linkNameById = new Map(linkTargets.map((t) => [t.id, t.recordName]));

    const linkIdsByBoard = new Map<string, Record<string, string>>();
    for (const b of allBoards) {
      for (const v of b.values) {
        if (!linkFieldIds.has(v.field.id) || !v.value) continue;
        const targetName = linkNameById.get(v.value);
        if (targetName === undefined) continue;
        const row = linkIdsByBoard.get(b.id) ?? {};
        row[v.field.fieldName] = v.value;
        linkIdsByBoard.set(b.id, row);
        v.value = targetName;
      }
    }

    let boards = allBoards;

    if (search) {
      const q = search.toLowerCase();
      boards = boards.filter(
        (b) =>
          b.recordName.toLowerCase().includes(q) ||
          b.values.some((v) => v.value?.toLowerCase().includes(q))
      );
    }

    if (filter && Object.keys(filter).length > 0) {
      const fieldTypeMap = new Map(fields.map((f) => [f.id, f.fieldType]));

      for (const [id, val] of Object.entries(filter)) {
        if (val === undefined || val === "") continue;

        const fieldType = fieldTypeMap.get(id);
        const useExactMatch =
          fieldType &&
          (fieldType === "DROPDOWN" ||
            fieldType === "STATUS" ||
            fieldType === "CHECKBOX");
        const needle = String(val).toLowerCase();

        boards = boards.filter((b) =>
          b.values.some((v) => {
            if (v.field.id !== id || v.value == null) return false;
            const hay = v.value.toLowerCase();
            return useExactMatch ? hay === needle : hay.includes(needle);
          })
        );
      }
    }

    const count = boards.length;
    const staticSortFields = ["recordName", "createdAt"];
    const isStaticSort = !sortBy || staticSortFields.includes(sortBy);
    const order = sortOrder === "desc" ? "desc" : "asc";

    const formattedAll = boards.map((b) => {
      const dynamicData = b.values.reduce(
        (acc, curr) => {
          acc[curr.field.fieldName] = curr.value;
          return acc;
        },
        {} as Record<string, string | null>
      );

      return {
        id: b.id,
        recordName: b.recordName,
        assignedTo: b.assignedTo ?? "",
        createdAt: b.createdAt,
        has_notification: b.notifications.length > 0,
        linkIds: linkIdsByBoard.get(b.id) ?? {},
        ...dynamicData,
      };
    });

    const sortField = !isStaticSort
      ? fields.find((f) => f.id === sortBy)
      : null;
    const sortKey = isStaticSort
      ? sortBy || "recordName"
      : sortField?.fieldName;

    if (sortKey === "createdAt" || !sortKey) {
      formattedAll.sort((a, b) => {
        const cmp = a.createdAt.getTime() - b.createdAt.getTime();
        return (sortKey ? order === "desc" : true) ? -cmp : cmp;
      });
    } else {
      formattedAll.sort((a, b) => {
        const valA = (a as Record<string, any>)[sortKey] ?? "";
        const valB = (b as Record<string, any>)[sortKey] ?? "";
        const cmp = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: "base",
        });
        return order === "desc" ? -cmp : cmp;
      });
    }

    const formatted = formattedAll.slice(offset, offset + Number(limit));

    const data = {
      pagination: {
        page: Number(page),
        limit: Number(limit),
        count: count,
      },
      columns: fields.map((f) => ({
        id: f.id,
        name: f.fieldName,
        type: f.fieldType,
      })),
      data: formatted,
    };

    await cacheData(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:${boardDateFrom}:${boardDateTo}:${page}:${limit}:${search}:${sortBy}:${sortOrder}:${JSON.stringify(filter)}`,
      data,
      60 * 10
    );

    return data;
  }

  async getBoardStats(organizationId: string, moduleType: string) {
    const cacheKey = `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:stats`;
    const cachedStats = await getData(cacheKey);

    if (cachedStats) {
      return cachedStats;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_MS);
    const previousActiveSince = new Date(now.getTime() - ACTIVE_WINDOW_MS * 2);

    const recordWhere: Prisma.BoardWhereInput = {
      organizationId,
      isDeleted: false,
      moduleType: moduleType as ModuleType,
    };

    const countyField = await prisma.field.findFirst({
      where: {
        organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
        fieldName: "County",
      },
      select: { id: true },
    });

    const [
      total,
      totalBeforeThisMonth,
      activeRecords,
      previousActiveRecords,
      countyValues,
    ] = await Promise.all([
      prisma.board.count({ where: recordWhere }),
      prisma.board.count({
        where: { ...recordWhere, createdAt: { lt: monthStart } },
      }),
      prisma.activity.findMany({
        where: { record: recordWhere, createdAt: { gte: activeSince } },
        select: { recordId: true },
        distinct: ["recordId"],
      }),
      prisma.activity.findMany({
        where: {
          record: recordWhere,
          createdAt: { gte: previousActiveSince, lt: activeSince },
        },
        select: { recordId: true },
        distinct: ["recordId"],
      }),
      countyField
        ? prisma.fieldValue.findMany({
            where: { fieldId: countyField.id, record: recordWhere },
            select: { value: true, record: { select: { createdAt: true } } },
          })
        : [],
    ]);

    const counties = new Set<string>();
    const previousCounties = new Set<string>();

    for (const entry of countyValues) {
      const county = entry.value?.replace(/ county$/i, "").trim();
      if (!county) continue;
      counties.add(county.toLowerCase());
      if (entry.record.createdAt < monthStart) {
        previousCounties.add(county.toLowerCase());
      }
    }

    const stats = {
      totalFacilities: { value: total, previous: totalBeforeThisMonth },
      activePartners: {
        value: activeRecords.length,
        previous: previousActiveRecords.length,
      },
      countiesCovered: {
        value: counties.size,
        previous: previousCounties.size,
      },
    };

    await cacheData(cacheKey, stats, 60 * 10);

    return stats;
  }

  async getRecords(
    organizationId: string,
    moduleType: string,
    page: number,
    limit: number
  ) {
    const offset = (page - 1) * Number(limit);
    const records = await prisma.board.findMany({
      where: {
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
      },
      select: {
        id: true,
        recordName: true,
      },
      skip: offset,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const formatted = records.map((r) => {
      return {
        id: r.id,
        value: r.recordName,
      };
    });
    return formatted;
  }

  async getRelatedRecords(recordId: string, organizationId: string) {
    await prisma.board.findFirstOrThrow({
      where: { id: recordId, organizationId: organizationId },
      select: { id: true },
    });

    const relations = await prisma.boardRelation.findMany({
      where: {
        OR: [{ sourceId: recordId }, { targetId: recordId }],
      },
      include: {
        source: {
          select: {
            id: true,
            recordName: true,
            moduleType: true,
            isDeleted: true,
            organizationId: true,
          },
        },
        target: {
          select: {
            id: true,
            recordName: true,
            moduleType: true,
            isDeleted: true,
            organizationId: true,
          },
        },
      },
    });

    const seen = new Set<string>();
    const related: {
      id: string;
      recordName: string;
      moduleType: string;
      relationType: string;
    }[] = [];

    for (const r of relations) {
      const counterpart = r.source.id === recordId ? r.target : r.source;
      if (counterpart.isDeleted) continue;
      if (counterpart.organizationId !== organizationId) continue;
      if (seen.has(counterpart.id)) continue;
      seen.add(counterpart.id);
      related.push({
        id: counterpart.id,
        recordName: counterpart.recordName,
        moduleType: counterpart.moduleType,
        relationType: r.relationType,
      });
    }

    return related;
  }

  async getAllRecordHistory(organizationId: string, filters: HistoryFilters) {
    const { page = 1, limit = 50, moduleType } = filters;
    const offset = (page - 1) * Number(limit);
    const where: Prisma.HistoryWhereInput = {
      record: {
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
      },
      action: { in: ["delete", "update", "restore"] },
    };
    const [history, total] = await Promise.all([
      prisma.history.findMany({
        where: where,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: offset,
        include: {
          user: {
            select: {
              name: true,
            },
          },
          record: {
            select: {
              recordName: true,
            },
          },
        },
      }),
      prisma.history.count({ where: where }),
    ]);
    const formatted = history.map((h) => {
      return {
        id: h.id,
        createdAt: h.createdAt,
        createdBy: h.user?.name,
        action: h.action,
        recordId: h.recordId,
        recordName: h.record?.recordName,
        oldValue: h.oldValue,
        newValue: h.newValue,
        column: h.column,
      };
    });
    return {
      data: formatted,
      total: total,
    };
  }

  async getHistory(recordId: string, take: number, offset: number) {
    const [history, total] = await Promise.all([
      prisma.history.findMany({
        where: { recordId: recordId },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: take,
        skip: offset,
      }),
      prisma.history.count({
        where: { recordId: recordId },
      }),
    ]);

    const formatted = history.map((h) => {
      return {
        id: h.id,
        createdAt: h.createdAt,
        createdBy: h.user?.name,
        action: h.action,
        oldValue: h.oldValue,
        newValue: h.newValue,
        column: h.column,
      };
    });

    return {
      data: formatted,
      total: total,
    };
  }

  async getRecordAnalyze(
    recordId: string,
    dateStartDate?: Date,
    dateEndDate?: Date
  ) {
    const record = await prisma.board.findFirstOrThrow({
      where: { id: recordId },
      select: {
        recordName: true,
        assignedUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!record.assignedUser) {
      return {
        recordId,
        recordName: record.recordName,
        assignedTo: null,
        summary: null,
        message: "Lead is not yet assigned to a marketing member.",
      };
    }

    const where: Prisma.MarketingWhereInput = {
      member: {
        user: {
          id: record.assignedUser.id,
        },
      },
    } as Prisma.MarketingWhereInput;

    if (dateStartDate && dateEndDate) {
      where.createdAt = {
        gte: dateStartDate,
        lte: dateEndDate,
      };
    }

    if (record.recordName) {
      where.facility = {
        contains: record.recordName,
        mode: "insensitive",
      };
    }

    const marketingLogs = await prisma.marketing.findMany({
      where,
      select: {
        facility: true,
        touchpoints: true,
        talkedTo: true,
        notes: true,
      },
    });

    const totalInteractions = marketingLogs.length;

    const facilitiesCovered = [
      ...new Set(
        marketingLogs
          .map((m) => m.facility)
          .filter((f): f is string => Boolean(f))
      ),
    ];

    const touchpointCount: Record<string, number> = {};

    marketingLogs.forEach((log) => {
      if (Array.isArray(log.touchpoints)) {
        log.touchpoints.forEach((tp) => {
          touchpointCount[tp] = (touchpointCount[tp] || 0) + 1;
        });
      }
    });

    const touchpointsUsed = Object.entries(touchpointCount).map(
      ([type, count]) => ({ type, count })
    );

    const peopleContacted = [
      ...new Set(
        marketingLogs
          .map((m) => m.talkedTo)
          .filter((p): p is string => Boolean(p))
      ),
    ];

    const engagementLevel =
      totalInteractions >= 6
        ? "High"
        : totalInteractions >= 3
          ? "Medium"
          : "Low";

    const narrative = totalInteractions
      ? `The lead has been engaged through ${
          touchpointsUsed.length
            ? touchpointsUsed
                .map((t) => t.type.replace(/_/g, " ").toLowerCase())
                .join(", ")
            : "various touchpoints"
        } across ${
          facilitiesCovered.length
            ? facilitiesCovered.join(", ")
            : "multiple facilities"
        }. Discussions were held with ${
          peopleContacted.length
            ? peopleContacted.join(", ")
            : "various contacts"
        }, suggesting ${engagementLevel.toLowerCase()} engagement and ongoing follow-ups.`
      : "No marketing interactions have been recorded for this lead.";

    return {
      recordId,
      recordName: record.recordName,
      assignedTo: record.assignedUser?.name ?? "Unknown",
      summary: {
        totalInteractions,
        facilitiesCovered,
        touchpointsUsed,
        peopleContacted,
        engagementLevel,
        narrative,
      },
    };
  }

  async getFollowUpSuggestions(
    recordId: string,
    organizationId: string,
    force = false
  ) {
    const cacheKey = `followup:${recordId}`;
    if (!force) {
      const cached = await getData(cacheKey);
      if (cached) return cached;
    }

    const record = await prisma.board.findFirstOrThrow({
      where: { id: recordId, organizationId: organizationId },
      select: {
        id: true,
        recordName: true,
        createdAt: true,
        updatedAt: true,
        assignedUser: {
          select: { id: true, name: true },
        },
        values: {
          select: {
            value: true,
            field: { select: { fieldName: true } },
          },
        },
      },
    });

    const fieldValues = record.values.reduce(
      (acc, v) => {
        acc[v.field.fieldName] = v.value;
        return acc;
      },
      {} as Record<string, string | null>
    );

    const recentHistory = await prisma.history.findMany({
      where: { recordId: recordId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        action: true,
        column: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    const totalHistoryEvents = await prisma.history.count({
      where: { recordId: recordId },
    });

    // Fetch marketing engagement if lead has an assigned user
    let engagementSummary: {
      totalInteractions: number;
      touchpointsUsed: { type: string; count: number }[];
      peopleContacted: string[];
      engagementLevel: string;
    } | null = null;

    if (record.assignedUser) {
      const where: Prisma.MarketingWhereInput = {
        member: { user: { id: record.assignedUser.id } },
      } as Prisma.MarketingWhereInput;

      if (record.recordName) {
        where.facility = { contains: record.recordName, mode: "insensitive" };
      }

      const marketingLogs = await prisma.marketing.findMany({
        where,
        select: { facility: true, touchpoints: true, talkedTo: true },
      });

      const touchpointCount: Record<string, number> = {};
      marketingLogs.forEach((log) => {
        if (Array.isArray(log.touchpoints)) {
          log.touchpoints.forEach((tp) => {
            touchpointCount[tp] = (touchpointCount[tp] || 0) + 1;
          });
        }
      });

      const totalInteractions = marketingLogs.length;
      engagementSummary = {
        totalInteractions,
        touchpointsUsed: Object.entries(touchpointCount).map(
          ([type, count]) => ({ type, count })
        ),
        peopleContacted: [
          ...new Set(
            marketingLogs
              .map((m) => m.talkedTo)
              .filter((p): p is string => Boolean(p))
          ),
        ],
        engagementLevel:
          totalInteractions >= 6
            ? "High"
            : totalInteractions >= 3
              ? "Medium"
              : "Low",
      };
    }

    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - record.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const lastUpdate =
      recentHistory.length > 0 ? recentHistory[0].createdAt : record.updatedAt;
    const daysSinceLastUpdate = Math.floor(
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const context = {
      recordName: record.recordName,
      fieldValues,
      recentHistory: recentHistory.map((h) => ({
        action: h.action,
        column: h.column,
        oldValue: h.oldValue,
        newValue: h.newValue,
        createdAt: h.createdAt,
        createdBy: h.user?.name ?? null,
      })),
      engagementSummary,
      metadata: {
        daysSinceCreation,
        daysSinceLastUpdate,
        currentStatus: fieldValues["Status"] ?? null,
        totalHistoryEvents,
      },
    };

    const prompt = followUpPrompt(context);
    const job = await this.geminiQueue.add("gemini", {
      type: "follow-up-suggestions",
      prompt,
      cacheKey,
      cacheTtl: 60 * 10,
    });

    const result = await job.waitUntilFinished(this.geminiQueueEvents, 30000);
    return result;
  }

  async getRecordById(
    recordId: string,
    organizationId: string,
    moduleType: string
  ) {
    const record = await prisma.board.findUniqueOrThrow({
      where: {
        id: recordId,
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
      },
      select: {
        id: true,
        recordName: true,
        assignedUser: {
          select: {
            name: true,
          },
        },
        values: {
          select: {
            field: {
              select: {
                fieldName: true,
              },
            },
            value: true,
          },
        },
      },
    });

    const fields = await prisma.field.findMany({
      orderBy: { fieldOrder: "asc" },
      where: {
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
      },
    });

    // Resolve link field ids to target names, keeping ids for navigation
    const linkFieldNames = new Set(
      fields
        .filter((f) => this.isLinkFieldType(f.fieldType))
        .map((f) => f.fieldName)
    );

    const linkValueIds = record.values
      .filter((v) => linkFieldNames.has(v.field.fieldName) && v.value)
      .map((v) => v.value as string);

    const linkTargets = linkValueIds.length
      ? await prisma.board.findMany({
          where: { id: { in: linkValueIds }, organizationId },
          select: { id: true, recordName: true },
        })
      : [];
    const linkNameById = new Map(linkTargets.map((t) => [t.id, t.recordName]));

    const linkIds: Record<string, string> = {};
    for (const v of record.values) {
      if (!linkFieldNames.has(v.field.fieldName) || !v.value) continue;
      const targetName = linkNameById.get(v.value);
      if (targetName === undefined) continue;
      linkIds[v.field.fieldName] = v.value;
      v.value = targetName;
    }

    // ✅ Build dynamic fields ONCE
    const dynamicData = record.values.reduce(
      (acc, curr) => {
        acc[curr.field.fieldName] = curr.value;
        return acc;
      },
      {} as Record<string, string | null>
    );

    // ✅ Single formatted record
    const formatted = {
      id: record.id,
      recordName: record.recordName,
      assignedTo: record.assignedUser?.name ?? null,
      linkIds,
      ...dynamicData,
    };

    return {
      columns: fields.map((f) => ({
        id: f.id,
        name: f.fieldName,
        type: f.fieldType,
      })),
      data: formatted, // 👈 object, not array
    };
  }

  async getColumns(organizationId: string, moduleType: string) {
    const columns = await prisma.field.findMany({
      where: {
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
      },
      select: {
        id: true,
        fieldName: true,
        fieldType: true,
      },
    });

    const formattedColumns = columns.map((c) => ({
      id: c.id,
      name: c.fieldName,
      type: c.fieldType,
    }));
    return formattedColumns;
  }

  async getValueId(fieldId: string, value: string) {
    const data = await prisma.field.findUnique({
      where: {
        id: fieldId,
      },
      select: {
        values: {
          select: {
            value: true,
            contactValue: true,
          },
        },
      },
    });

    const target = decodeURI(value);
    const valueItem = data?.values.find((v) => v.value === target);
    if (!valueItem?.contactValue) {
      return { contactNumber: "", email: "", address: "" };
    }
    return valueItem.contactValue;
  }

  async getCountyConfiguration(organizationId: string) {
    const counties = await prisma.boardCounty.findMany({
      where: { organizationId: organizationId },
      select: {
        id: true,
        countyName: true,
        boardCountyAssignedTo: {
          select: {
            assignedTo: true,
          },
        },
      },
    });

    return counties.map((c) => ({
      id: c.id,
      name: c.countyName,
      liaisons: c.boardCountyAssignedTo.map((a) => a.assignedTo),
    }));
  }

  async getRecordFieldOptions(
    fieldId: string,
    organizationId: string,
    page: number | null,
    limit: number | null
  ) {
    if (fieldId === BoardFieldType.ASSIGNED_TO) {
      const assignedTo = await prisma.member.findMany({
        where: {
          organizationId: organizationId,
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return assignedTo.map((a) => ({
        id: a.user.id,
        value: a.user.name,
      }));
    }

    const where: Prisma.FieldOptionFindManyArgs = {
      where: { fieldId: fieldId, isDeleted: false },
    };

    if (page && limit) {
      where.skip = (page - 1) * limit;
      where.take = Number(limit);
      where.orderBy = { optionName: "asc" };
    }

    const options = await prisma.fieldOption.findMany(where);

    if (!page && !limit) {
      return options.map((o) => ({
        id: o.id,
        value: o.optionName,
        color: o.color,
      }));
    }

    const field = await prisma.field.findUnique({
      where: { id: fieldId, isDeleted: false },
      select: {
        fieldName: true,
      },
    });

    const total = await prisma.fieldOption.count({
      where: where.where,
    });

    return {
      field: field?.fieldName,
      data: options.map((o) => ({
        id: o.id,
        value: o.optionName,
        color: o.color,
      })),
      total: total,
    };
  }

  async updateRecordValue(
    recordId: string,
    fieldId: string,
    value: string,
    organizationId: string,
    memberId: string,
    moduleType: string,
    reason?: string,
    previousValue?: string
  ) {
    try {
      if (fieldId !== BoardFieldType.ASSIGNED_TO && fieldId !== "Record") {
        const field = await prisma.field.findUnique({
          where: { id: fieldId, organizationId: organizationId },
          select: { fieldType: true, id: true, fieldName: true },
        });

        if (!field) throw new NotFoundException("Field not found");

        if (field.fieldType === BoardFieldType.LOCATION) {
          return this.updateLocationValue(
            recordId,
            value,
            organizationId,
            moduleType
          );
        }
      }

      const recordValue = await prisma.$transaction(async (tx) => {
        const baseCtx: RecordUpdateContext = {
          recordId,
          value,
          organizationId,
          memberId,
          moduleType,
          reason,
        };

        if (fieldId === BoardFieldType.ASSIGNED_TO) {
          return this.updateAssignedToValue(tx, baseCtx);
        }

        if (fieldId === "Record") {
          return this.updateRecordNameValue(tx, baseCtx);
        }

        const field = await tx.field.findUnique({
          where: {
            id: fieldId,
            organizationId: organizationId,
            isDeleted: false,
            moduleType: moduleType as ModuleType,
          },
          select: {
            fieldType: true,
            id: true,
            fieldName: true,
          },
        });

        if (!field) throw new NotFoundException("Field not found");

        const ctx: FieldUpdateContext = { ...baseCtx, field };

        if (this.isLinkFieldType(field.fieldType)) {
          return this.updateReferralLinkValue(tx, ctx);
        }

        if (field.fieldType === BoardFieldType.MULTISELECT) {
          return this.updateMultiselectValue(tx, ctx);
        }

        if (field.fieldName === "County" && moduleType === "REFERRAL") {
          return this.updateCountyValue(tx, ctx);
        }

        if (field.fieldType === BoardFieldType.STATUS) {
          return this.updateStatusValue(tx, ctx);
        }

        return this.updateGenericValue(tx, ctx);
      });

      await deleteData(`followup:${recordId}`);

      return recordValue;
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  private async purgeBoardCache(organizationId: string, moduleType: string) {
    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );
  }

  private async updateLocationValue(
    recordId: string,
    value: string,
    organizationId: string,
    moduleType: string
  ) {
    const geocodeResult = await this.geocodeLocation(value, recordId);

    const locationData = await prisma.$transaction(async (tx) => {
      return this.saveLocationFields(
        geocodeResult,
        value,
        recordId,
        organizationId,
        tx
      );
    });

    await this.purgeBoardCache(organizationId, moduleType);
    await deleteData(`followup:${recordId}`);

    this.boardGateway.emitRecordValueLocation(
      organizationId,
      recordId,
      { ...locationData },
      moduleType
    );

    return { message: "Location updated successfully" };
  }

  private async updateAssignedToValue(
    tx: Prisma.TransactionClient,
    ctx: RecordUpdateContext
  ) {
    const { recordId, value, organizationId, memberId, moduleType } = ctx;

    await this.updateAssignedTo(tx, recordId, value, memberId);
    await this.purgeBoardCache(organizationId, moduleType);

    this.boardGateway.emitRecordValueUpdated(
      organizationId,
      recordId,
      "Assigned To",
      value,
      moduleType
    );

    return { message: "Assigned to updated successfully" };
  }

  private async updateRecordNameValue(
    tx: Prisma.TransactionClient,
    ctx: RecordUpdateContext
  ) {
    const { recordId, value, organizationId, memberId, moduleType } = ctx;

    await this.updateRecordName(tx, recordId, value, memberId);
    await this.purgeBoardCache(organizationId, moduleType);

    this.boardGateway.emitRecordValueUpdated(
      organizationId,
      recordId,
      "Record",
      value,
      moduleType
    );

    return { message: "Record name updated successfully" };
  }

  private resolveLinkTarget(
    moduleType: string,
    fieldName: string,
    fieldType: BoardFieldType
  ) {
    if (fieldType === BoardFieldType.CONTACT_LINK) {
      return {
        targetModule: "CONTACT" as const,
        relation: "CONTACT_LINK" as const,
      };
    }
    if (fieldType === BoardFieldType.COMPANY_LINK) {
      return {
        targetModule: "COMPANY" as const,
        relation: "COMPANY_LINK" as const,
      };
    }
    if (moduleType === "CONTACT") {
      return fieldName === "Company"
        ? {
            targetModule: "COMPANY" as const,
            relation: "COMPANY_LINK" as const,
          }
        : { targetModule: "LEAD" as const, relation: "CONTACT_LINK" as const };
    }
    if (moduleType === "COMPANY") {
      return {
        targetModule: "LEAD" as const,
        relation: "COMPANY_LINK" as const,
      };
    }
    return {
      targetModule: "LEAD" as const,
      relation: "REFERRAL_LINK" as const,
    };
  }

  private isLinkFieldType(fieldType: BoardFieldType) {
    return (
      fieldType === BoardFieldType.REFERRAL_LINK ||
      fieldType === BoardFieldType.CONTACT_LINK ||
      fieldType === BoardFieldType.COMPANY_LINK
    );
  }

  private async updateReferralLinkValue(
    tx: Prisma.TransactionClient,
    ctx: FieldUpdateContext
  ) {
    const { recordId, value, organizationId, memberId, moduleType, field } =
      ctx;
    const { targetModule, relation } = this.resolveLinkTarget(
      moduleType,
      field.fieldName,
      field.fieldType
    );

    if (this.isLinkFieldType(field.fieldType)) {
      if (!value) {
        const storedValue = await tx.fieldValue.findFirst({
          where: { recordId: recordId, fieldId: field.id },
          select: { value: true },
        });

        const relations = await tx.boardRelation.findMany({
          where: {
            sourceId: recordId,
            relationType: relation,
          },
          include: {
            target: { select: { id: true, recordName: true } },
          },
        });

        const existingRelation =
          relations.find(
            (r) =>
              r.target.id === storedValue?.value ||
              r.target.recordName === storedValue?.value
          ) ?? (relations.length === 1 ? relations[0] : undefined);

        if (!existingRelation)
          throw new NotFoundException("No linked record found");

        await tx.boardRelation.delete({
          where: { id: existingRelation.id },
        });

        await tx.fieldValue.update({
          where: {
            recordId_fieldId: {
              recordId: recordId,
              fieldId: field.id,
            },
          },
          data: {
            value: null,
          },
        });

        await this.createRecordHistory(
          recordId,
          existingRelation.target.recordName ?? "",
          "",
          memberId,
          tx,
          "update",
          field.fieldName,
          field.id
        );

        await purgeAllCacheKeys(
          `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
        );

        this.boardGateway.emitRecordValueUpdated(
          organizationId,
          recordId,
          field.fieldName,
          null,
          moduleType
        );

        return {
          message: "Referral link removed successfully",
          recordValue: null,
        };
      }

      const existingRecordValue = await tx.fieldValue.findFirst({
        where: {
          recordId: recordId,
          fieldId: field.id,
        },
        select: { value: true },
      });

      // Value is the target board id; fall back to name matching for
      // legacy clients and CSV imports that still send record names.
      let record = await tx.board.findFirst({
        where: {
          id: value,
          organizationId: organizationId,
          moduleType: targetModule,
          isDeleted: false,
        },
        select: { id: true, recordName: true },
      });

      if (!record) {
        const linkCandidates = await tx.board.findMany({
          where: {
            organizationId: organizationId,
            moduleType: targetModule,
            isDeleted: false,
          },
          select: { id: true, recordName: true },
        });
        record = linkCandidates.find((b) => b.recordName === value) ?? null;
      }

      if (!record) throw new NotFoundException("Record not found");

      const priorRelations = await tx.boardRelation.findMany({
        where: { sourceId: recordId, relationType: relation },
        include: { target: { select: { id: true, recordName: true } } },
      });
      const previousRelation = priorRelations.find(
        (r) =>
          r.target.id === existingRecordValue?.value ||
          r.target.recordName === existingRecordValue?.value
      );
      if (previousRelation && previousRelation.target.id !== record.id) {
        await tx.boardRelation.delete({
          where: { id: previousRelation.id },
        });
      }

      await tx.boardRelation.upsert({
        where: {
          sourceId_targetId_relationType: {
            sourceId: recordId,
            targetId: record.id,
            relationType: relation,
          },
        },
        update: {
          targetId: record.id,
        },
        create: {
          sourceId: recordId,
          targetId: record.id,
          relationType: relation,
          organizationId: organizationId,
        },
      });

      const recordValue = await tx.fieldValue.upsert({
        where: {
          recordId_fieldId: { recordId: recordId, fieldId: field.id },
        },
        update: { value: record.id },
        create: {
          recordId: recordId,
          fieldId: field.id,
          value: record.id,
          organizationId: organizationId,
        },
      });

      await this.createRecordHistory(
        recordId,
        previousRelation?.target.recordName ?? existingRecordValue?.value ?? "",
        record.recordName,
        memberId,
        tx,
        "update",
        field.fieldName,
        field.id
      );

      await purgeAllCacheKeys(
        `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
      );

      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        recordId,
        field.fieldName,
        record.recordName,
        moduleType
      );

      return {
        message: "Referral link updated successfully",
        recordValue,
      };
    }
  }

  private async updateMultiselectValue(
    tx: Prisma.TransactionClient,
    ctx: FieldUpdateContext
  ) {
    const { recordId, value, organizationId, moduleType, field, memberId } = ctx;

    if (field.fieldType === BoardFieldType.MULTISELECT) {
      // Normalize value into an array of clean strings
      const normalizedValue = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value

              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : [];

      const previousValue = await tx.fieldValue.findUnique({
        where: {
          recordId_fieldId: { recordId: recordId, fieldId: field.id },
        },
        select: { value: true },
      });

      await tx.fieldValue.upsert({
        where: {
          recordId_fieldId: {
            recordId: recordId,
            fieldId: field.id,
          },
        },
        update: {
          value: JSON.stringify(normalizedValue),
        },
        create: {
          recordId: recordId,
          fieldId: field.id,
          value: JSON.stringify(normalizedValue),
          organizationId: organizationId,
        },
      });

      await this.createRecordHistory(
        recordId,
        previousValue?.value ?? "",
        JSON.stringify(normalizedValue),
        memberId,
        tx,
        "update",
        field.fieldName,
        field.id
      );

      await purgeAllCacheKeys(
        `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
      );

      // Rows carry multiselect values as the stored JSON string
      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        recordId,
        field.fieldName,
        JSON.stringify(normalizedValue),
        moduleType
      );

      return {
        message: "Multiselect updated successfully",
      };
    }
  }

  private async updateCountyValue(
    tx: Prisma.TransactionClient,
    ctx: FieldUpdateContext
  ) {
    const { recordId, value, organizationId, moduleType, field, memberId } = ctx;

    if (field.fieldName === "County" && moduleType === "REFERRAL") {
      const [county, facilityField] = await Promise.all([
        tx.boardCounty.findFirstOrThrow({
          where: {
            countyName: value,
            organizationId: organizationId,
          },
          include: {
            boardCountyAssignedTo: {
              select: {
                assignedTo: true,
              },
            },
          },
        }),
        tx.field.findFirstOrThrow({
          where: {
            fieldName: "Facility",
            organizationId: organizationId,
          },
          select: {
            id: true,
          },
        }),
      ]);

      const [previousCounty, previousFacility] = await Promise.all([
        tx.fieldValue.findUnique({
          where: {
            recordId_fieldId: { recordId: recordId, fieldId: field.id },
          },
          select: { value: true },
        }),
        tx.fieldValue.findUnique({
          where: {
            recordId_fieldId: { recordId: recordId, fieldId: facilityField.id },
          },
          select: { value: true },
        }),
      ]);

      // Save County value
      await tx.fieldValue.upsert({
        where: {
          recordId_fieldId: {
            recordId: recordId,
            fieldId: field.id,
          },
        },
        update: { value },
        create: {
          recordId: recordId,
          fieldId: field.id,
          value,
          organizationId: organizationId,
        },
      });

      // Facility mirrors every liaison assigned to the county
      const liaisons = county.boardCountyAssignedTo
        .map((a) => a.assignedTo)
        .join(", ");

      await tx.fieldValue.upsert({
        where: {
          recordId_fieldId: {
            recordId: recordId,
            fieldId: facilityField.id,
          },
        },
        update: {
          value: liaisons,
        },
        create: {
          recordId: recordId,
          fieldId: facilityField.id,
          value: liaisons,
          organizationId: organizationId,
        },
      });

      await this.createRecordHistory(
        recordId,
        previousCounty?.value ?? "",
        value,
        memberId,
        tx,
        "update",
        field.fieldName,
        field.id
      );

      await this.createRecordHistory(
        recordId,
        previousFacility?.value ?? "",
        liaisons,
        memberId,
        tx,
        "update",
        "Facility",
        facilityField.id
      );

      await purgeAllCacheKeys(
        `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
      );

      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        recordId,
        field.fieldName,
        value,
        moduleType
      );
      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        recordId,
        "Facility",
        liaisons,
        moduleType
      );

      return {
        message: "County assigned successfully",
      };
    }
  }

  private async updateStatusValue(
    tx: Prisma.TransactionClient,
    ctx: FieldUpdateContext
  ) {
    const { recordId, value, organizationId, moduleType, reason, field, memberId } =
      ctx;

    if (field.fieldType === BoardFieldType.STATUS) {
      const statusFields = await tx.field.findMany({
        where: {
          fieldName: {
            in: ["Reason", "Action Date (Accepted / Rejected)"],
          },
          isDeleted: false,
          organizationId: organizationId,
          moduleType: moduleType as ModuleType,
        },
        select: { id: true, fieldName: true },
      });

      const reasonField = statusFields.find((f) => f.fieldName === "Reason");
      const actionDateField = statusFields.find(
        (f) => f.fieldName === "Action Date (Accepted / Rejected)"
      );

      const previousStatus = await tx.fieldValue.findUnique({
        where: {
          recordId_fieldId: { recordId: recordId, fieldId: field.id },
        },
        select: { value: true },
      });

      await tx.fieldValue.upsert({
        where: {
          recordId_fieldId: {
            recordId: recordId,
            fieldId: field.id,
          },
        },
        update: { value },
        create: {
          recordId: recordId,
          fieldId: field.id,
          value,
          organizationId: organizationId,
        },
      });

      if (reason && reasonField) {
        await tx.fieldValue.upsert({
          where: {
            recordId_fieldId: {
              recordId: recordId,
              fieldId: reasonField.id,
            },
          },
          update: { value: reason },
          create: {
            recordId: recordId,
            fieldId: reasonField.id,
            value: reason,
            organizationId: organizationId,
          },
        });
      }

      const now = new Date().toISOString();

      if (actionDateField) {
        await tx.fieldValue.upsert({
          where: {
            recordId_fieldId: {
              recordId: recordId,
              fieldId: actionDateField.id,
            },
          },
          update: { value: now },
          create: {
            recordId: recordId,
            fieldId: actionDateField.id,
            value: now,
            organizationId: organizationId,
          },
        });
      }

      const reasonData = {
        fieldName: reasonField?.fieldName ?? "",
        value: reason ?? "",
      };

      const actionDateData = {
        fieldName: actionDateField?.fieldName ?? "",
        value: now ?? "",
      };

      await this.createRecordHistory(
        recordId,
        previousStatus?.value ?? "",
        value,
        memberId,
        tx,
        "update",
        field.fieldName,
        field.id
      );

      await purgeAllCacheKeys(
        `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
      );

      this.boardGateway.emitRecordValueStatusUpdated(
        organizationId,
        recordId,
        field.fieldName,
        value,
        moduleType,
        reasonData,
        actionDateData
      );
      return {
        message: "Status updated successfully",
      };
    }
  }

  private async updateGenericValue(
    tx: Prisma.TransactionClient,
    ctx: FieldUpdateContext
  ) {
    const { recordId, value, organizationId, memberId, moduleType, field } =
      ctx;

    const existingRecordValue = await tx.fieldValue.findUnique({
      where: {
        recordId_fieldId: { recordId: recordId, fieldId: field.id },
      },
      select: { value: true },
    });

    const recordValue = await tx.fieldValue.upsert({
      where: {
        recordId_fieldId: { recordId: recordId, fieldId: field.id },
      },
      update: { value },
      create: {
        recordId: recordId,
        fieldId: field.id,
        value,
        organizationId: organizationId,
      },
    });

    await this.createRecordHistory(
      recordId,
      existingRecordValue?.value ?? "",
      value,
      memberId,
      tx,
      "update",
      field.fieldName,
      field.id
    );

    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );

    this.boardGateway.emitRecordValueUpdated(
      organizationId,
      recordId,
      field.fieldName,
      value,
      moduleType
    );
    return {
      message: "Record value updated successfully",
      recordValue: recordValue,
    };
  }

  async scanBusinessCard(
    file: Express.Multer.File,
    organizationId: string,
    moduleType: string
  ) {
    const fields = await prisma.field.findMany({
      where: {
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
      },
      orderBy: { fieldOrder: "asc" },
      select: { id: true, fieldName: true, fieldType: true },
    });

    const fieldDescriptions = fields.map((f) => ({
      name: f.fieldName,
      type: f.fieldType,
    }));

    const base64Image = file.buffer.toString("base64");

    const text = await aiGenerateVision({
      type: "businessCardScan",
      prompt: businessCardScanPrompt(fieldDescriptions),
      image: { mimeType: file.mimetype, base64: base64Image },
    });

    const parsed = JSON.parse(text || "{}");

    // Map field names to field IDs
    const fieldMap = new Map(fields.map((f) => [f.fieldName, f.id]));
    const mappedFields: Record<string, string | null> = {};

    if (parsed.fields) {
      for (const [fieldName, value] of Object.entries(parsed.fields)) {
        const fieldId = fieldMap.get(fieldName);
        if (fieldId) {
          mappedFields[fieldId] = (value as string) ?? null;
        }
      }
    }

    return {
      recordName: parsed.recordName ?? "",
      contactInfo: parsed.contactInfo ?? {
        name: null,
        phone: null,
        email: null,
        address: null,
      },
      fields: mappedFields,
      columns: fields.map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
      })),
    };
  }

  async insertBoardRecord(
    tx: Prisma.TransactionClient,
    params: {
      recordName: string;
      organizationId: string;
      memberId: string | null;
      moduleType: string;
      initialValues?: Record<string, string | null>;
      personContact?: {
        fieldId: string;
        contactNumber?: string;
        email?: string;
        address?: string;
      };
    }
  ) {
    const {
      recordName,
      organizationId,
      memberId,
      moduleType,
      initialValues,
      personContact,
    } = params;

    const board = await tx.board.create({
      data: {
        recordName: recordName ?? "",
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
      },
    });

    const fields = await tx.field.findMany({
      where: {
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
      },
    });

    const fieldValues = fields.map((f) => ({
      recordId: board.id,
      fieldId: f.id,
      value: initialValues?.[f.id] ?? null,
      organizationId: organizationId,
    }));

    await tx.fieldValue.createMany({ data: fieldValues });

    if (personContact?.fieldId) {
      const personFieldValue = await tx.fieldValue.findUnique({
        where: {
          recordId_fieldId: {
            recordId: board.id,
            fieldId: personContact.fieldId,
          },
        },
      });

      if (personFieldValue) {
        await tx.fieldPersonInformation.create({
          data: {
            fieldValueId: personFieldValue.id,
            contactNumber: formatPhoneNumber(personContact.contactNumber ?? ""),
            email: personContact.email ?? "",
            address: personContact.address ?? "",
          },
        });
      }
    }

    await tx.history.create({
      data: {
        recordId: board.id,
        oldValue: "",
        newValue: recordName,
        action: "create",
        createdBy: memberId,
        organizationId: organizationId,
      },
    });

    await tx.boardNotificationState.create({
      data: {
        recordId: board.id,
        lastSeen: new Date(),
      },
    });

    return board;
  }

  async afterRecordCreated(
    record: Board,
    organizationId: string,
    moduleType: string
  ) {
    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );
    this.boardGateway.emitRecordCreated(organizationId, record, moduleType);
  }

  async createRecord(
    recordName: string,
    organizationId: string,
    memberId: string,
    moduleType: string,
    initialValues?: Record<string, string | null>,
    personContact?: {
      fieldId: string;
      contactNumber?: string;
      email?: string;
      address?: string;
    }
  ) {
    const record = await prisma.$transaction(async (tx) => {
      return this.insertBoardRecord(tx, {
        recordName,
        organizationId,
        memberId,
        moduleType,
        initialValues,
        personContact,
      });
    });

    await this.afterRecordCreated(record, organizationId, moduleType);

    return record;
  }

  async createReferral(
    referralItems: { referral_name: string; [key: string]: any }[],
    organizationId: string,
    memberId: string,
    moduleType: string
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const fields = await tx.field.findMany({
        where: {
          organizationId: organizationId,
          moduleType: moduleType as ModuleType,
          isDeleted: false,
        },
        orderBy: { fieldOrder: "asc" },
      });

      // Preload link target candidates so create-time link values (id or
      // name) resolve to the target board id, matching the update path.
      const linkFields = fields.filter((f) =>
        this.isLinkFieldType(f.fieldType)
      );
      const linkTargetsByModule = new Map<
        string,
        { id: string; recordName: string }[]
      >();
      for (const field of linkFields) {
        const { targetModule } = this.resolveLinkTarget(
          moduleType,
          field.fieldName,
          field.fieldType
        );
        if (linkTargetsByModule.has(targetModule)) continue;
        linkTargetsByModule.set(
          targetModule,
          await tx.board.findMany({
            where: {
              organizationId: organizationId,
              moduleType: targetModule,
              isDeleted: false,
            },
            select: { id: true, recordName: true },
          })
        );
      }

      const createdReferrals: any = [];
      const allReferralValues: any[] = [];
      const allHistoryEntries: any[] = [];
      const allNotificationStates: any[] = [];
      const allRelations: any[] = [];

      for (const referralData of referralItems) {
        const referral = await tx.board.create({
          data: {
            recordName: referralData.referral_name ?? "",
            moduleType: moduleType as ModuleType,
            organizationId: organizationId,
          },
        });

        createdReferrals.push(referral);

        for (const field of fields) {
          const customValue =
            referralData[field.fieldName] ??
            referralData[field.fieldName.toLowerCase()];
          let value: string | null = null;

          if (customValue !== undefined && customValue !== null) {
            // Handle MULTISELECT type
            if (field.fieldType === BoardFieldType.MULTISELECT) {
              const normalizedValue = Array.isArray(customValue)
                ? customValue
                : typeof customValue === "string"
                  ? customValue
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean)
                  : [];
              value = JSON.stringify(normalizedValue);
            } else if (this.isLinkFieldType(field.fieldType)) {
              const { targetModule, relation } = this.resolveLinkTarget(
                moduleType,
                field.fieldName,
                field.fieldType
              );
              const candidates = linkTargetsByModule.get(targetModule) ?? [];
              const raw = String(customValue);
              const target =
                candidates.find((c) => c.id === raw) ??
                candidates.find((c) => c.recordName === raw);
              // Store the target board id; skip unresolved names silently
              value = target?.id ?? null;
              if (target) {
                allRelations.push({
                  sourceId: referral.id,
                  targetId: target.id,
                  relationType: relation,
                  organizationId: organizationId,
                });
              }
            } else {
              value = String(customValue);
            }
          }

          allReferralValues.push({
            id: uuidv4(),
            recordId: referral.id,
            fieldId: field.id,
            value: value,
            organizationId: organizationId,
          });
        }

        // Prepare history entry
        allHistoryEntries.push({
          id: uuidv4(),
          createdAt: new Date(),
          recordId: referral.id,
          oldValue: null,
          newValue: referralData.referral_name,
          action: "create",
          createdBy: memberId,
          column: moduleType === "REFERRAL" ? "Referral Name" : "Name",
          organizationId: organizationId,
        });

        allNotificationStates.push({
          id: uuidv4(),
          recordId: referral.id,
          lastSeen: new Date(),
        });
      }

      // Bulk insert all referral values
      if (allReferralValues.length > 0) {
        await tx.fieldValue.createMany({
          data: allReferralValues,
        });
      }

      // Bulk insert all history entries
      if (allHistoryEntries.length > 0) {
        await tx.history.createMany({
          data: allHistoryEntries,
        });
      }

      // Bulk insert all notification states
      if (allNotificationStates.length > 0) {
        await tx.boardNotificationState.createMany({
          data: allNotificationStates,
        });
      }

      // Bulk insert link relations
      if (allRelations.length > 0) {
        await tx.boardRelation.createMany({
          data: allRelations,
          skipDuplicates: true,
        });
      }

      return {
        message: `${createdReferrals.length} referral(s) created successfully`,
        count: createdReferrals.length,
        referrals: createdReferrals,
      };
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    for (const referral of result.referrals) {
      this.boardGateway.emitRecordCreated(organizationId, referral, moduleType);
    }

    return result;
  }

  async createCountyAssignment(
    name: string,
    organizationId: string,
    liaisons: string[]
  ) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.boardCounty.findFirst({
        where: { countyName: name, organizationId: organizationId },
        include: { boardCountyAssignedTo: { select: { assignedTo: true } } },
      });

      if (!existing) {
        await tx.boardCounty.create({
          data: {
            countyName: name,
            organizationId: organizationId,
            boardCountyAssignedTo: {
              create: liaisons.map((assignedTo) => ({ assignedTo })),
            },
          },
        });
        return;
      }

      // Append only liaisons not already assigned to this county
      const current = new Set(
        existing.boardCountyAssignedTo.map((a) => a.assignedTo)
      );
      const added = liaisons.filter((l) => !current.has(l));
      if (added.length === 0) return;

      await tx.boardCountyAssignedTo.createMany({
        data: added.map((assignedTo) => ({
          assignedTo,
          boardCountyId: existing.id,
        })),
      });
    });

    return {
      message: "County assignment created successfully",
    };
  }

  async updateCountyLiaisons(
    countyId: string,
    organizationId: string,
    liaisons: string[]
  ) {
    const county = await prisma.boardCounty.findFirst({
      where: { id: countyId, organizationId: organizationId },
      select: { id: true },
    });

    if (!county) throw new NotFoundException("County not found");

    await prisma.$transaction(async (tx) => {
      await tx.boardCountyAssignedTo.deleteMany({
        where: { boardCountyId: countyId },
      });
      if (liaisons.length === 0) return;
      await tx.boardCountyAssignedTo.createMany({
        data: liaisons.map((assignedTo) => ({
          assignedTo,
          boardCountyId: countyId,
        })),
      });
    });

    return {
      message: "County liaisons updated successfully",
    };
  }

  async restoreRecord(
    recordId: string,
    history_id: string,
    organizationId: string,
    event_type: string,
    userId: string,
    moduleType: string = "LEAD"
  ) {
    const history = await prisma.history.findUniqueOrThrow({
      where: { id: history_id },
      select: {
        column: true,
        fieldId: true,
        oldValue: true,
        newValue: true,
        recordId: true,
      },
    });

    if (event_type === "update") {
      const record = await prisma.board.findUniqueOrThrow({
        where: { id: history.recordId },
        select: { isDeleted: true },
      });

      if (record.isDeleted) {
        throw new NotFoundException("Record is deleted");
      }

      // History rows written before fieldId existed are still matched by name
      const field = await prisma.field.findFirstOrThrow({
        where: {
          ...(history.fieldId
            ? { id: history.fieldId }
            : { fieldName: history.column ?? "" }),
          organizationId: organizationId,
          isDeleted: false,
          moduleType: moduleType as ModuleType,
        },
      });

      await prisma.$transaction(async (tx) => {
        await tx.fieldValue.update({
          where: {
            recordId_fieldId: {
              recordId: history.recordId,
              fieldId: field.id,
            },
          },
          data: { value: history.oldValue },
        });
        await tx.history.create({
          data: {
            recordId: history.recordId,
            oldValue: history.newValue,
            newValue: history.oldValue,
            action: "restore",
            column: history.column,
            fieldId: history.fieldId,
            createdBy: userId,
            organizationId: organizationId,
          },
        });
      });

      await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        history.recordId,
        history.column ?? "",
        history.oldValue ?? "",
        moduleType
      );
      return {
        message: "Record restored successfully",
      };
    }

    if (event_type === "delete") {
      await prisma.$transaction(async (tx) => {
        await tx.board.update({
          where: { id: history.recordId },
          data: { isDeleted: Boolean(history.oldValue) },
        });
        await tx.history.create({
          data: {
            recordId: history.recordId,
            oldValue: history.newValue,
            newValue: history.oldValue,
            action: "restore",
            column: history.column,
            fieldId: history.fieldId,
            createdBy: userId,
            organizationId: organizationId,
          },
        });
      });

      await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        history.recordId,
        history.column ?? "",
        history.oldValue ?? "",
        moduleType
      );
      return {
        message: "Record deleted successfully",
      };
    }
  }

  async setRecordNotificationState(recordId: string, organizationId: string) {
    const [deleted, record] = await Promise.all([
      prisma.boardNotificationState.deleteMany({
        where: { recordId: recordId },
      }),
      prisma.board.findUnique({
        where: { id: recordId },
        select: { moduleType: true },
      }),
    ]);

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitRecordNotificationState(
      organizationId,
      recordId,
      record?.moduleType ?? "LEAD"
    );

    return {
      message: "Notification marked as seen",
      deleted: deleted.count,
    };
  }

  async createColumn(
    column_name: string,
    fieldType: BoardFieldType,
    moduleType: string,
    organizationId: string
  ) {
    const lastColumn = await prisma.field.findFirst({
      where: {
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
      },
      orderBy: { fieldOrder: "desc" },
    });

    const newOrder = lastColumn ? lastColumn.fieldOrder + 1 : 1;

    const field = await prisma.field.create({
      data: {
        fieldName: column_name,
        fieldType: fieldType,
        fieldOrder: newOrder,
        organizationId: organizationId,
        moduleType: moduleType as ModuleType,
      },
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitColumnCreated(
      organizationId,
      { id: field.id, name: field.fieldName, type: field.fieldType },
      moduleType
    );
  }

  async deleteColumn(
    columnId: string,
    organizationId: string,
    moduleType: string
  ) {
    const field = await prisma.field.findFirst({
      where: {
        id: columnId,
        organizationId: organizationId,
        isDeleted: false,
      },
    });

    if (!field) {
      throw new NotFoundException("Column not found");
    }

    await prisma.field.update({
      where: { id: columnId },
      data: { isDeleted: true },
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitColumnDeleted(organizationId, columnId, moduleType);

    return { message: "Column deleted successfully" };
  }

  /**
   * Geocode a location string via Geocodify API.
   * Runs OUTSIDE the transaction to avoid timeout from external HTTP calls.
   */
  private async geocodeLocation(location_name: string, recordId: string) {
    if (location_name === "") return { cleared: true } as const;

    const existing = await prisma.fieldValue.findFirst({
      where: { recordId: recordId },
      select: { value: true },
    });

    if (existing?.value === location_name) {
      return { cached: true, address: location_name } as const;
    }

    const geocodifyResponse = await fetch(
      `https://api.geocodify.com/v2/geocode?api_key=${appConfig.GEOCODIFY_API_KEY}&q=${encodeURIComponent(
        location_name
      )}`
    );

    if (!geocodifyResponse.ok) {
      throw new Error("Geocodify request failed");
    }

    const data = await geocodifyResponse.json();
    const feature = data?.response?.features?.[0];

    if (!feature) {
      throw new Error("No geocoding result found");
    }

    const props = feature.properties;

    return {
      geocoded: true,
      address: props.name as string,
      city: (props.locality ?? null) as string | null,
      state: (props.region_a ?? null) as string | null,
      zip: lookupByName(props.locality, props.region_a)[0].zip as string,
      county: props.county
        ? (props.county.replace(/ County/g, "") as string)
        : null,
      country: (props.country ?? null) as string | null,
    } as const;
  }

  /**
   * Save geocoded location fields to DB. Only DB writes, no external calls.
   */
  private async saveLocationFields(
    geocodeResult: Awaited<ReturnType<typeof this.geocodeLocation>>,
    location_name: string,
    recordId: string,
    organizationId: string,
    tx: Prisma.TransactionClient
  ) {
    const locationFieldNames = [
      "Address",
      "City",
      "State",
      "Zip Code",
      "County",
      "Country",
    ];

    if ("cleared" in geocodeResult) {
      const fields = await tx.field.findMany({
        where: {
          fieldName: { in: locationFieldNames },
          isDeleted: false,
          organizationId: organizationId,
        },
        select: { id: true },
      });
      await tx.fieldValue.updateMany({
        where: {
          recordId: recordId,
          fieldId: { in: fields.map((f) => f.id) },
        },
        data: { value: null },
      });
      return { address: null, isCached: true };
    }

    if ("cached" in geocodeResult) {
      return { address: location_name, isCached: true };
    }

    const locationData = {
      address: geocodeResult.address,
      city: geocodeResult.city,
      state: geocodeResult.state,
      zip: geocodeResult.zip,
      county: geocodeResult.county,
      country: geocodeResult.country,
    };

    const fields = await tx.field.findMany({
      where: {
        fieldName: { in: locationFieldNames },
        isDeleted: false,
        organizationId: organizationId,
      },
      select: { id: true, fieldName: true },
    });

    const mapper: Record<string, string | null> = {
      address: locationData.address,
      city: locationData.city,
      state: locationData.state,
      zipcode: locationData.zip,
      county: locationData.county,
      country: locationData.country,
    };

    const upserts = fields
      .map((field) => {
        const key = field.fieldName.toLowerCase().replace(/\s+/g, "");
        const value = mapper[key];
        if (!value) return null;

        return tx.fieldValue.upsert({
          where: {
            recordId_fieldId: {
              recordId: recordId,
              fieldId: field.id,
            },
          },
          update: { value },
          create: {
            recordId: recordId,
            fieldId: field.id,
            value,
            organizationId: organizationId,
          },
        });
      })
      .filter(Boolean);

    await Promise.all(upserts);

    return {
      Address: locationData.address,
      City: locationData.city,
      State: locationData.state,
      "Zip Code": locationData.zip,
      County: locationData.county,
      Country: locationData.country,
    };
  }

  async updateAssignedTo(
    tx: Prisma.TransactionClient,
    recordId: string,
    value: string,
    memberId: string
  ) {
    const existingRecord = await tx.board.findUnique({
      where: { id: recordId },
      select: {
        assignedTo: true,
        assignedUser: {
          select: {
            name: true,
          },
        },
      },
    });

    await tx.board.update({
      where: { id: recordId },
      data: { assignedTo: value },
    });

    const newAssignedUser = await tx.user.findUniqueOrThrow({
      where: {
        id: value,
      },
      select: {
        name: true,
      },
    });

    await this.createRecordHistory(
      recordId,
      existingRecord?.assignedUser?.name ?? "",
      newAssignedUser.name ?? "",
      memberId,
      tx,
      "update",
      "Assigned To"
    );
  }

  async updateRecordName(
    tx: Prisma.TransactionClient,
    recordId: string,
    value: string,
    memberId: string
  ) {
    const existingRecord = await tx.board.findUnique({
      where: { id: recordId },
      select: { recordName: true },
    });

    await tx.board.update({
      where: { id: recordId },
      data: { recordName: value },
    });
    await this.createRecordHistory(
      recordId,
      existingRecord?.recordName ?? "",
      value,
      memberId,
      tx,
      "update",
      "Lead"
    );
  }

  async createRecordFieldOption(
    fieldId: string,
    optionName: string,
    color?: string
  ) {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: { organizationId: true },
    });

    return await prisma.fieldOption.create({
      data: {
        optionName: optionName,
        fieldId: fieldId,
        organizationId: field?.organizationId ?? null,
        ...(color && { color }),
      },
    });
  }

  async createRecordDataFromCSV(
    excelData: Record<string, unknown>[],
    organizationId: string,
    moduleType: string
  ) {
    const job = await this.csvImportQueue.add("import", {
      excelData,
      organizationId,
      moduleType,
    });

    return { jobId: job.id, message: "CSV import queued" };
  }

  async createRecordHistory(
    recordId: string,
    oldValue: string,
    newValue: string,
    createdBy: string,
    tx: Prisma.TransactionClient,
    action?: string,
    column?: string,
    fieldId?: string
  ) {
    const record = await tx.board.findUnique({
      where: { id: recordId },
      select: { organizationId: true },
    });

    return await tx.history.create({
      data: {
        recordId: recordId,
        oldValue: oldValue,
        newValue: newValue,
        action: action ?? "create",
        createdBy: createdBy,
        column: column,
        fieldId: fieldId,
        organizationId: record?.organizationId ?? null,
      },
    });
  }

  async updateRecordHistory(recordId: string) {
    return await prisma.history.updateMany({
      where: { id: recordId },
      data: { createdAt: new Date() },
    });
  }

  async updateContactValue(fieldId: string, body: UpdateContactDto) {
    return await prisma.$transaction(async (tx) => {
      const field = await tx.field.findUniqueOrThrow({
        where: { id: fieldId },
        select: {
          values: {
            select: { id: true, value: true },
          },
        },
      });

      const matched = field.values.find((v) => v.value === body.value);
      if (!matched) throw new NotFoundException("Field value not found");

      return await tx.fieldPersonInformation.upsert({
        where: { fieldValueId: matched.id },
        create: {
          contactNumber: formatPhoneNumber(body.contactNumber),
          email: body.email,
          address: body.address,
          fieldValueId: field.values[0].id,
        },
        update: {
          contactNumber: formatPhoneNumber(body.contactNumber),
          email: body.email,
          address: body.address,
        },
      });
    });
  }

  async deleteRecordHistory(timelineId: string) {
    const timeline = await prisma.history.findUnique({
      where: { id: timelineId },
    });
    if (!timeline) throw new NotFoundException("Timeline not found");

    return await prisma.history.delete({ where: { id: timelineId } });
  }

  async deleteCountyAssignment(countyId: string, organizationId: string) {
    const county = await prisma.boardCounty.findFirst({
      where: { id: countyId, organizationId: organizationId },
      select: { id: true },
    });

    if (!county) throw new NotFoundException("County not found");

    await prisma.$transaction(async (tx) => {
      await tx.boardCountyAssignedTo.deleteMany({
        where: { boardCountyId: countyId },
      });
      await tx.boardCounty.delete({ where: { id: countyId } });
    });
    return {
      message: "County assignment deleted successfully",
    };
  }

  async deleteRecordFieldOption(optionId: string) {
    return await prisma.fieldOption.update({
      where: { id: optionId },
      data: { isDeleted: true },
    });
  }

  async deleteRecord(
    column_ids: string[],
    organizationId: string,
    memberId: string,
    moduleType: string = "LEAD"
  ) {
    await prisma.$transaction(async (tx) => {
      const records = await tx.board.findMany({
        where: {
          id: { in: column_ids },
          organizationId: organizationId,
          isDeleted: false,
        },
        select: { id: true, recordName: true },
      });

      await tx.board.updateMany({
        where: { id: { in: records.map((r) => r.id) } },
        data: { isDeleted: true },
      });

      for (const record of records) {
        await this.createRecordHistory(
          record.id,
          record.recordName,
          "",
          memberId,
          tx,
          "delete"
        );
      }
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitRecordDeleted(organizationId, column_ids, moduleType);
  }

  async sendBulkEmail(
    recordIds: string[],
    emailSubject: string,
    emailBody: string,
    organizationId: string,
    userId: string,
    moduleType: string,
    sendVia?: string
  ) {
    const job = await this.bulkEmailQueue.add("bulk-send", {
      recordIds,
      emailSubject,
      emailBody,
      organizationId,
      userId,
      moduleType,
      sendVia,
    });

    return { jobId: job.id, message: "Bulk email queued" };
  }

  async getActivities(
    recordId: string,
    organizationId: string,
    page: number = 1,
    limit: number = 15
  ) {
    const offset = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: {
          recordId: recordId,
          organizationId: organizationId,
        },
        include: {
          creator: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activity.count({
        where: {
          recordId: recordId,
          organizationId: organizationId,
        },
      }),
    ]);

    return {
      data: activities.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        activityType: a.activityType,
        status: a.status,
        dueDate: a.dueDate,
        completedAt: a.completedAt,
        recipientEmail: a.recipientEmail,
        emailSubject: a.emailSubject,
        emailBody: a.emailBody,
        emailSentAt: a.emailSentAt,
        senderEmail: a.senderEmail,
        faxNumber: a.faxNumber,
        faxId: a.faxId,
        faxSentAt: a.faxSentAt,
        direction: a.direction,
        threadToken: a.threadToken,
        openCount: a.openCount,
        firstOpenedAt: a.firstOpenedAt,
        lastOpenedAt: a.lastOpenedAt,
        createdAt: a.createdAt,
        createdBy: a.creator.name,
        creator_email: a.creator.email,
      })),
      total,
    };
  }

  async createActivity(
    data: {
      recordId?: string;
      title?: string;
      description?: string;
      activityType?: string;
      dueDate?: string;
      recipientEmail?: string;
      emailSubject?: string;
      emailBody?: string;
      send_via?: string;
    },
    organizationId: string,
    userId: string
  ) {
    const recordId = data.recordId!;
    const title = data.title!;
    const activityType = data.activityType!;

    await prisma.board.findFirstOrThrow({
      where: { id: recordId, organizationId: organizationId },
    });

    const activity = await prisma.activity.create({
      data: {
        title: title,
        description: data.description,
        activityType: activityType as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        recipientEmail: data.recipientEmail,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
        recordId: recordId,
        createdBy: userId,
        organizationId: organizationId,
      },
    });

    const creator = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true },
    });

    this.boardGateway.emitActivityCreated(organizationId, recordId, {
      id: activity.id,
      title: activity.title,
      activityType: activity.activityType,
      status: activity.status,
      createdBy: creator.name,
      createdAt: activity.createdAt,
    });

    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      activityType: activity.activityType,
      status: activity.status,
      dueDate: activity.dueDate,
      recipientEmail: activity.recipientEmail,
      emailSubject: activity.emailSubject,
      emailBody: activity.emailBody,
      senderEmail: activity.senderEmail,
      createdAt: activity.createdAt,
      createdBy: creator.name,
      creator_email: creator.email,
    };
  }

  async createFaxActivity(
    data: {
      recordId: string;
      title: string;
      description?: string;
      faxNumber: string;
      file: { buffer: Buffer; filename: string; mimetype: string };
    },
    organizationId: string,
    userId: string,
    memberRole: string
  ) {
    await prisma.board.findFirstOrThrow({
      where: { id: data.recordId, organizationId: organizationId },
    });

    // Fax is sent immediately — the document is never stored, only the trail
    const fax = await this.faxService.sendFax(data.faxNumber, data.file, {
      userId,
      orgId: organizationId,
      role: memberRole,
    });

    const now = new Date();
    const activity = await prisma.activity.create({
      data: {
        title: data.title,
        description: data.description,
        activityType: "FAX",
        status: "COMPLETED",
        completedAt: now,
        faxNumber: data.faxNumber,
        faxId: fax.id ?? null,
        faxSentAt: now,
        recordId: data.recordId,
        createdBy: userId,
        organizationId: organizationId,
      },
    });

    const creator = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true },
    });

    this.boardGateway.emitActivityCreated(organizationId, data.recordId, {
      id: activity.id,
      title: activity.title,
      activityType: activity.activityType,
      status: activity.status,
      createdBy: creator.name,
      createdAt: activity.createdAt,
    });

    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      activityType: activity.activityType,
      status: activity.status,
      faxNumber: activity.faxNumber,
      faxId: activity.faxId,
      faxSentAt: activity.faxSentAt,
      createdAt: activity.createdAt,
      createdBy: creator.name,
      creator_email: creator.email,
    };
  }

  async completeActivity(
    activityId: string,
    organizationId: string,
    userId: string,
    emailOverrides?: {
      emailBody?: string;
      emailSubject?: string;
      recipientEmail?: string;
      send_via?: string;
    }
  ) {
    const activity = await prisma.activity.findFirstOrThrow({
      where: { id: activityId, organizationId: organizationId },
      include: {
        record: { select: { recordName: true } },
        creator: { select: { name: true, email: true } },
      },
    });

    if (activity.status === "COMPLETED") {
      throw new BadRequestException("Activity is already completed");
    }

    const updateData: Prisma.ActivityUpdateInput = {
      status: "COMPLETED",
      completedAt: new Date(),
    };

    if (activity.activityType === "EMAIL") {
      const recipientEmail =
        emailOverrides?.recipientEmail || activity.recipientEmail;
      const subject =
        emailOverrides?.emailSubject || activity.emailSubject || activity.title;
      const body =
        emailOverrides?.emailBody ||
        activity.emailBody ||
        activity.description ||
        "";

      if (!recipientEmail) {
        throw new BadRequestException(
          "Recipient email is required for EMAIL activities"
        );
      }

      const { senderEmail, trackingId } = await this.emailDispatchService.send({
        userId,
        to: recipientEmail,
        subject,
        recipientName: activity.record.recordName,
        body,
        senderName: activity.creator.name,
        sendVia: emailOverrides?.send_via,
      });

      updateData.emailSentAt = new Date();
      updateData.recipientEmail = recipientEmail;
      updateData.emailSubject = subject;
      updateData.emailBody = body;
      updateData.senderEmail = senderEmail;
      updateData.trackingId = trackingId;
      updateData.threadToken = activity.threadToken ?? trackingId;
    }

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
    });

    this.boardGateway.emitActivityUpdated(
      organizationId,
      activity.recordId,
      activityId,
      "COMPLETED"
    );

    return updated;
  }

  async updateActivity(
    activityId: string,
    organizationId: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      dueDate?: string;
      recipientEmail?: string;
      emailSubject?: string;
      emailBody?: string;
    }
  ) {
    await prisma.activity.findFirstOrThrow({
      where: { id: activityId, organizationId: organizationId },
    });

    const updateData: Prisma.ActivityUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status as any;
    if (data.dueDate !== undefined)
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.recipientEmail !== undefined)
      updateData.recipientEmail = data.recipientEmail;
    if (data.emailSubject !== undefined)
      updateData.emailSubject = data.emailSubject;
    if (data.emailBody !== undefined) updateData.emailBody = data.emailBody;

    if (data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
    if (data.status === "CANCELLED") {
      updateData.completedAt = null;
    }

    return await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
    });
  }

  async deleteActivity(activityId: string, organizationId: string) {
    await prisma.activity.findFirstOrThrow({
      where: { id: activityId, organizationId: organizationId },
    });

    await prisma.activity.delete({ where: { id: activityId } });

    return { message: "Activity deleted successfully" };
  }

  async findDuplicateRecords(
    organizationId: string,
    moduleType: string,
    email?: string,
    phone?: string,
    excludeRecordId?: string
  ) {
    if (!email && !phone) {
      return { duplicates: [] };
    }

    const fields = await prisma.field.findMany({
      where: {
        organizationId,
        moduleType: moduleType as ModuleType,
        isDeleted: false,
        fieldType: { in: [BoardFieldType.EMAIL, BoardFieldType.PHONE] },
      },
      select: { id: true, fieldType: true, fieldName: true },
    });

    const checks = fields.flatMap((field) => {
      if (field.fieldType === BoardFieldType.EMAIL && email) {
        return [{ fieldId: field.id, value: email.trim() }];
      }
      if (field.fieldType === BoardFieldType.PHONE && phone) {
        return [{ fieldId: field.id, value: phone.trim() }];
      }
      return [];
    });

    if (checks.length === 0) {
      return { duplicates: [] };
    }

    // FieldValue.value is encrypted at rest, so matching runs on decrypted
    // rows here, not in Postgres
    const candidates = await prisma.fieldValue.findMany({
      where: {
        fieldId: { in: checks.map((check) => check.fieldId) },
        record: {
          organizationId,
          isDeleted: false,
          ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
        },
      },
      select: {
        value: true,
        fieldId: true,
        field: { select: { fieldName: true } },
        record: { select: { id: true, recordName: true } },
      },
    });

    const wanted = new Map(
      checks.map((check) => [check.fieldId, check.value.toLowerCase()])
    );

    const duplicates = candidates
      .filter(
        (candidate) =>
          candidate.value &&
          wanted.get(candidate.fieldId) === candidate.value.trim().toLowerCase()
      )
      .slice(0, 10)
      .map((match) => ({
        recordId: match.record.id,
        recordName: match.record.recordName,
        matchedField: match.field.fieldName,
        matchedValue: match.value,
      }));

    return { duplicates };
  }
}

function resolveRecordName(row: Record<string, unknown>) {
  return (
    row["Name of Organization"] ||
    row["Company Name"] ||
    row["Organization"] ||
    row["Org Name"] ||
    "Untitled Lead"
  );
}
