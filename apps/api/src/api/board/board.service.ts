import { GeocodeCommand } from "@aws-sdk/client-geo-places";
import { BOARD_NOTIFICATION_EVENT, formatPhoneNumber } from "@dashboard/shared";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ActivityStatus,
  ActivityType,
  Board,
  BoardFieldType,
  Prisma,
} from "@prisma/client";
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
import { CACHE_PREFIX } from "../../lib/constant";
import { geoPlaces } from "../../lib/geo/geo-places";
import { resolveModuleId, toModuleType } from "../../lib/module/system-modules";
import { prisma } from "../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { FaxService } from "../fax/fax.service";
import { ImageService, privateViewUrl } from "../image/image.service";
import { LiaisonActivityService } from "../liaison/liaison-activity.service";
import { toComponents } from "../places/places.service";
import { BoardNotifyService } from "./board-notify.service";
import { BoardGateway } from "./board.gateway";
import { CsvNewColumnsSchema } from "./dto/board.dto";
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
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  column?: string;
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
    private readonly boardNotify: BoardNotifyService,
    private readonly liaisonActivity: LiaisonActivityService,
    private readonly imageService: ImageService,
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
    const scopedModuleId = moduleType
      ? await resolveModuleId(moduleType, organizationId)
      : undefined;

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
      moduleId: scopedModuleId,
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
                  fieldType: true,
                },
              },
              value: true,
              _count: { select: { attachments: true } },
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
          moduleId: scopedModuleId,
          isDeleted: false,
        },
        orderBy: { fieldOrder: "asc" },
      }),
    ]);

    // A column can only be deleted while empty; check independently of the
    // page/date/search filters above so "has data" reflects every record,
    // not just the ones currently in view. Values are encrypted at rest, so
    // emptiness is checked in JS after the read-path decrypts them, not in SQL.
    const [fieldValuesForDataCheck, fieldsWithAttachments] = await Promise.all([
      prisma.fieldValue.findMany({
        where: {
          fieldId: { in: fields.map((f) => f.id) },
          record: { isDeleted: false, organizationId },
        },
        select: { fieldId: true, value: true },
      }),
      prisma.fieldValueAttachment.findMany({
        where: {
          organizationId,
          fieldValue: {
            fieldId: { in: fields.map((f) => f.id) },
            record: { isDeleted: false },
          },
        },
        select: { fieldValue: { select: { fieldId: true } } },
        distinct: ["fieldValueId"],
      }),
    ]);
    // Trimmed to match deleteColumn's guard: if the two disagree, the header
    // hides a Delete the server would have allowed.
    const fieldIdsWithData = new Set(
      fieldValuesForDataCheck
        .filter((v) => v.value?.trim())
        .map((v) => v.fieldId)
    );
    for (const a of fieldsWithAttachments) {
      fieldIdsWithData.add(a.fieldValue.fieldId);
    }

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
          acc[curr.field.fieldName] =
            curr.field.fieldType === BoardFieldType.ATTACHMENT
              ? String(curr._count.attachments)
              : curr.value;
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
        hasData: fieldIdsWithData.has(f.id),
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
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
      moduleId: scopedModuleId,
    };

    const countyField = await prisma.field.findFirst({
      where: {
        organizationId,
        moduleId: scopedModuleId,
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
    limit: number,
    search?: string
  ) {
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const offset = (page - 1) * Number(limit);

    // recordName is encrypted at rest with a random IV, so a search cannot be
    // pushed into SQL: the page is read whole and narrowed after decryption.
    const records = await prisma.board.findMany({
      where: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
        isDeleted: false,
      },
      select: {
        id: true,
        recordName: true,
      },
      ...(search ? {} : { skip: offset, take: Number(limit) }),
      orderBy: { createdAt: "desc" },
    });

    const formatted = records.map((r) => {
      return {
        id: r.id,
        value: r.recordName,
      };
    });

    if (!search) return formatted;

    const needle = search.toLowerCase();
    return formatted
      .filter((r) => (r.value ?? "").toLowerCase().includes(needle))
      .slice(0, Number(limit));
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
            module: { select: { key: true } },
            isDeleted: true,
            organizationId: true,
          },
        },
        target: {
          select: {
            id: true,
            recordName: true,
            moduleType: true,
            module: { select: { key: true } },
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
        moduleType: counterpart.module?.key ?? counterpart.moduleType,
        relationType: r.relationType,
      });
    }

    return related;
  }

  async getAllRecordHistory(organizationId: string, filters: HistoryFilters) {
    const {
      page = 1,
      limit = 50,
      moduleType,
      dateFrom,
      dateTo,
      userId,
      column,
    } = filters;
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const offset = (page - 1) * Number(limit);

    // Stats and filter options stay on the unfiltered org scope.
    const scope: Prisma.HistoryWhereInput = {
      record: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
      },
      action: { in: ["create", "delete", "update", "restore"] },
    };

    const where: Prisma.HistoryWhereInput = {
      ...scope,
      ...(userId ? { createdBy: userId } : {}),
      ...(column ? { column: column } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
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

  // Stats and filter options span the whole org scope, so they are fetched
  // separately from the paged rows and only change when the module changes.
  async getRecordHistoryMeta(organizationId: string, moduleType: string) {
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const scope: Prisma.HistoryWhereInput = {
      record: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
      },
      action: { in: ["create", "delete", "update", "restore"] },
    };

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const [scopeTotal, weekTotal, editors, columns] = await Promise.all([
      prisma.history.count({ where: scope }),
      prisma.history.count({
        where: { ...scope, createdAt: { gte: weekStart } },
      }),
      prisma.history.groupBy({
        by: ["createdBy"],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { createdBy: "desc" } },
      }),
      prisma.history.groupBy({ by: ["column"], where: scope }),
    ]);

    const editorIds = editors
      .map((editor) => editor.createdBy)
      .filter((id): id is string => Boolean(id));

    const editorUsers = editorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: editorIds } },
          select: { id: true, name: true },
        })
      : [];

    const editorNames = new Map(
      editorUsers.map((user) => [user.id, user.name])
    );

    return {
      stats: {
        totalChanges: scopeTotal,
        changesThisWeek: weekTotal,
        mostActiveEditor: editorIds.length
          ? (editorNames.get(editorIds[0]) ?? null)
          : null,
      },
      options: {
        users: editorIds.map((id) => ({
          id: id,
          name: editorNames.get(id) ?? "Unknown user",
        })),
        fields: columns
          .map((entry) => entry.column)
          .filter((name): name is string => Boolean(name))
          .sort(),
      },
    };
  }

  async getHistory(
    recordId: string,
    take: number,
    offset: number,
    organizationId: string
  ) {
    const [history, total] = await Promise.all([
      prisma.history.findMany({
        where: { recordId: recordId, record: { organizationId } },
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
        where: { recordId: recordId, record: { organizationId } },
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

  private getQueueByName(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.BULK_EMAIL:
        return this.bulkEmailQueue;
      case QUEUE_NAMES.CSV_IMPORT:
        return this.csvImportQueue;
      case QUEUE_NAMES.GEMINI:
        return this.geminiQueue;
      default:
        throw new BadRequestException("Unknown queue");
    }
  }

  // Job ids are queue-sequential, so the payload's organization is the only proof.
  async getJobStatus(jobId: string, queueName: string, organizationId: string) {
    const job = await this.getQueueByName(queueName).getJob(jobId);
    if (!job || job.data?.organizationId !== organizationId) {
      throw new NotFoundException("Job not found");
    }

    return {
      jobId: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async getRecordAnalyze(
    recordId: string,
    organizationId: string,
    dateStartDate?: Date,
    dateEndDate?: Date
  ) {
    const record = await prisma.board.findFirstOrThrow({
      where: { id: recordId, organizationId },
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
        organizationId,
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
      organizationId,
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const record = await prisma.board.findUniqueOrThrow({
      where: {
        id: recordId,
        organizationId: organizationId,
        moduleId: scopedModuleId,
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
        moduleId: scopedModuleId,
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const columns = await prisma.field.findMany({
      where: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
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

  async getValueId(fieldId: string, value: string, organizationId: string) {
    const data = await prisma.field.findFirst({
      where: {
        id: fieldId,
        organizationId,
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

  async getRecordFieldOptions(
    fieldId: string,
    organizationId: string,
    page: number | null,
    limit: number | null,
    search?: string
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

      const members = assignedTo.map((a) => ({
        id: a.user.id,
        value: a.user.name,
      }));

      if (!search) return members;

      const needle = search.toLowerCase();
      return members.filter((m) => m.value.toLowerCase().includes(needle));
    }

    const field = await prisma.field.findFirst({
      where: { id: fieldId, organizationId: organizationId, isDeleted: false },
      select: { fieldName: true, moduleType: true },
    });

    const where: Prisma.FieldOptionFindManyArgs = {
      where: {
        fieldId: fieldId,
        isDeleted: false,
        ...(search
          ? { optionName: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
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
    // No previousValue parameter on purpose: each sub-handler reads the prior
    // value from the row it is updating, which cannot be stale or forged the
    // way a client-supplied one can.
    reason?: string
  ) {
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    try {
      let changedField: {
        id: string;
        fieldType: BoardFieldType;
        fieldName: string;
      } | null = null;

      if (fieldId !== BoardFieldType.ASSIGNED_TO && fieldId !== "Record") {
        const field = await prisma.field.findUnique({
          where: { id: fieldId, organizationId: organizationId },
          select: { fieldType: true, id: true, fieldName: true },
        });

        if (!field) throw new NotFoundException("Field not found");

        if (field.fieldType === BoardFieldType.LOCATION) {
          return this.updateLocationValue(
            recordId,
            field.id,
            value,
            organizationId,
            moduleType
          );
        }

        changedField = field;

        if (field.fieldType === BoardFieldType.ATTACHMENT) {
          throw new BadRequestException(
            "Attachment fields are updated via /boards/:recordId/attachments"
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
            moduleId: scopedModuleId,
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

        if (field.fieldType === BoardFieldType.STATUS) {
          return this.updateStatusValue(tx, ctx);
        }

        return this.updateGenericValue(tx, ctx);
      });

      await deleteData(`followup:${recordId}`);

      await this.notifyValueChange({
        recordId,
        organizationId,
        moduleType,
        actorUserId: memberId,
        fieldId,
        value,
        field: changedField,
      });

      return recordValue;
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  // Runs after the transaction commits so the notice reads the settled row.
  private async notifyValueChange(input: {
    recordId: string;
    organizationId: string;
    moduleType: string;
    actorUserId: string;
    fieldId: string;
    value: string;
    field: { id: string; fieldType: BoardFieldType; fieldName: string } | null;
  }) {
    const base = {
      recordId: input.recordId,
      organizationId: input.organizationId,
      moduleType: input.moduleType,
      actorUserId: input.actorUserId,
    };

    if (input.fieldId === BoardFieldType.ASSIGNED_TO) {
      await this.boardNotify.notifyRecord({
        ...base,
        event: BOARD_NOTIFICATION_EVENT.ASSIGNED,
        title: (recordName) => `You were assigned ${recordName}`,
      });
      return;
    }

    const field = input.field;
    if (!field) return;

    if (field.fieldType === BoardFieldType.STATUS) {
      await this.boardNotify.notifyRecord({
        ...base,
        event: BOARD_NOTIFICATION_EVENT.STATUS_CHANGED,
        title: (recordName) => `${recordName} moved to ${input.value}`,
        body: `${field.fieldName} was updated`,
      });
      return;
    }

    if (this.isLinkFieldType(field.fieldType)) {
      await this.boardNotify.notifyRecord({
        ...base,
        event: BOARD_NOTIFICATION_EVENT.LINKED,
        title: (recordName) => `${recordName} was linked to another record`,
        body: field.fieldName,
      });
    }
  }

  private async purgeBoardCache(organizationId: string, moduleType: string) {
    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );
  }

  private async updateLocationValue(
    recordId: string,
    fieldId: string,
    value: string,
    organizationId: string,
    moduleType: string
  ) {
    const geocodeResult = await this.geocodeLocation(value, recordId, fieldId);

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
    const { recordId, value, organizationId, moduleType, field, memberId } =
      ctx;

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

  private async updateStatusValue(
    tx: Prisma.TransactionClient,
    ctx: FieldUpdateContext
  ) {
    const {
      recordId,
      value,
      organizationId,
      moduleType,
      reason,
      field,
      memberId,
    } = ctx;
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);

    if (field.fieldType === BoardFieldType.STATUS) {
      const statusFields = await tx.field.findMany({
        where: {
          fieldName: {
            in: ["Reason", "Action Date (Accepted / Rejected)"],
          },
          isDeleted: false,
          organizationId: organizationId,
          moduleId: scopedModuleId,
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const fields = await prisma.field.findMany({
      where: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);

    const board = await tx.board.create({
      data: {
        recordName: recordName ?? "",
        organizationId: organizationId,
        moduleType: toModuleType(moduleType),
        moduleId: scopedModuleId,
      },
    });

    const fields = await tx.field.findMany({
      where: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
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

    const dynamicData: Record<string, string | null> = {};
    for (const f of fields) {
      dynamicData[f.fieldName] = initialValues?.[f.id] ?? null;
    }

    return { ...board, dynamicData };
  }

  // Matches the row shape getAllBoards flattens FieldValue rows into, so a
  // live-created row renders its custom columns instead of coming in blank.
  private buildCreatedRow(
    board: { id: string; recordName: string; assignedTo?: string | null },
    dynamicData: Record<string, string | null> = {},
    linkIds: Record<string, string> = {}
  ) {
    return {
      id: board.id,
      recordName: board.recordName,
      assignedTo: board.assignedTo ?? "",
      has_notification: true,
      linkIds,
      ...dynamicData,
    };
  }

  async afterRecordCreated(
    record: Board & { dynamicData?: Record<string, string | null> },
    organizationId: string,
    moduleType: string
  ) {
    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );
    const { dynamicData, ...board } = record;
    this.boardGateway.emitRecordCreated(
      organizationId,
      this.buildCreatedRow(board, dynamicData),
      moduleType
    );
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

    await this.boardNotify.notifyRecord({
      recordId: record.id,
      organizationId,
      moduleType,
      actorUserId: memberId,
      event: BOARD_NOTIFICATION_EVENT.CREATED,
      title: (recordName) => `New ${moduleType.toLowerCase()}: ${recordName}`,
    });

    return record;
  }

  async createReferral(
    referralItems: { referral_name: string; [key: string]: any }[],
    organizationId: string,
    memberId: string,
    moduleType: string
  ) {
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const result = await prisma.$transaction(async (tx) => {
      const fields = await tx.field.findMany({
        where: {
          organizationId: organizationId,
          moduleId: scopedModuleId,
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

      const allReferralValues: any[] = [];
      const allHistoryEntries: any[] = [];
      const allNotificationStates: any[] = [];
      const allRelations: any[] = [];
      const dynamicDataByRecord = new Map<
        string,
        Record<string, string | null>
      >();
      const linkIdsByRecord = new Map<string, Record<string, string>>();

      // One insert instead of one per item: a create per referral is a round
      // trip inside the 5s interactive transaction default, so a large batch
      // ran out of time part way through.
      const recordsToCreate = referralItems.map((referralData) => ({
        id: uuidv4(),
        recordName: referralData.referral_name ?? "",
        moduleType: toModuleType(moduleType),
        moduleId: scopedModuleId,
        organizationId: organizationId,
      }));

      await tx.board.createMany({ data: recordsToCreate });

      for (const [index, referralData] of referralItems.entries()) {
        const recordId = recordsToCreate[index].id;

        for (const field of fields) {
          const customValue =
            referralData[field.fieldName] ??
            referralData[field.fieldName.toLowerCase()];
          let value: string | null = null;
          // For a link field the row shown live carries the target's
          // display name, same as getAllBoards; the raw id goes in linkIds.
          let displayValue: string | null = null;

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
              displayValue = value;
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
              displayValue = target?.recordName ?? null;
              if (target) {
                allRelations.push({
                  sourceId: recordId,
                  targetId: target.id,
                  relationType: relation,
                  organizationId: organizationId,
                });
                const linkIds = linkIdsByRecord.get(recordId) ?? {};
                linkIds[field.fieldName] = target.id;
                linkIdsByRecord.set(recordId, linkIds);
              }
            } else {
              value = String(customValue);
              displayValue = value;
            }
          }

          allReferralValues.push({
            id: uuidv4(),
            recordId: recordId,
            fieldId: field.id,
            value: value,
            organizationId: organizationId,
          });

          const row = dynamicDataByRecord.get(recordId) ?? {};
          row[field.fieldName] = displayValue;
          dynamicDataByRecord.set(recordId, row);
        }

        // Prepare history entry
        allHistoryEntries.push({
          id: uuidv4(),
          createdAt: new Date(),
          recordId: recordId,
          oldValue: null,
          newValue: referralData.referral_name,
          action: "create",
          createdBy: memberId,
          column: moduleType === "REFERRAL" ? "Referral Name" : "Name",
          organizationId: organizationId,
        });

        allNotificationStates.push({
          id: uuidv4(),
          recordId: recordId,
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

      const createdReferrals = await tx.board.findMany({
        where: { id: { in: recordsToCreate.map((record) => record.id) } },
      });

      return {
        message: `${createdReferrals.length} referral(s) created successfully`,
        count: createdReferrals.length,
        referrals: createdReferrals.map((r) => ({
          ...r,
          dynamicData: dynamicDataByRecord.get(r.id) ?? {},
          linkIds: linkIdsByRecord.get(r.id) ?? {},
        })),
      };
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    for (const referral of result.referrals) {
      const { dynamicData, linkIds, ...board } = referral;
      this.boardGateway.emitRecordCreated(
        organizationId,
        this.buildCreatedRow(board, dynamicData, linkIds),
        moduleType
      );

      await this.boardNotify.notifyRecord({
        recordId: referral.id,
        organizationId,
        moduleType,
        actorUserId: memberId,
        event: BOARD_NOTIFICATION_EVENT.CREATED,
        title: (recordName) => `New ${moduleType.toLowerCase()}: ${recordName}`,
      });
    }

    return result;
  }

  async restoreRecord(
    recordId: string,
    history_id: string,
    organizationId: string,
    event_type: string,
    userId: string,
    moduleType: string = "LEAD"
  ) {
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
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
          moduleId: scopedModuleId,
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
      await this.boardNotify.notifyRecord({
        recordId: history.recordId,
        organizationId,
        moduleType,
        actorUserId: userId,
        event: BOARD_NOTIFICATION_EVENT.RESTORED,
        title: (recordName) => `${recordName} was restored`,
        body: history.column,
      });

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
      await this.boardNotify.notifyRecord({
        recordId: history.recordId,
        organizationId,
        moduleType,
        actorUserId: userId,
        event: BOARD_NOTIFICATION_EVENT.RESTORED,
        title: (recordName) => `${recordName} was restored`,
      });

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
        select: { moduleType: true, module: { select: { key: true } } },
      }),
    ]);

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitRecordNotificationState(
      organizationId,
      recordId,
      record?.module?.key ?? record?.moduleType ?? "LEAD"
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    const lastColumn = await prisma.field.findFirst({
      where: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
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
        moduleType: toModuleType(moduleType),
        moduleId: scopedModuleId,
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);

    const field = await prisma.field.findFirst({
      where: {
        id: columnId,
        organizationId: organizationId,
        moduleId: scopedModuleId,
        isDeleted: false,
      },
    });

    if (!field) {
      throw new NotFoundException("Column not found");
    }

    // FieldValue.value is encrypted at rest, so "is it empty" cannot be asked in
    // Postgres — an empty string's ciphertext looks like any other. NULLs skip
    // encryption, so dropping those is the only part SQL can do up front.
    const [values, attachmentCount] = await Promise.all([
      prisma.fieldValue.findMany({
        where: {
          fieldId: columnId,
          value: { not: null },
          record: { organizationId, isDeleted: false },
        },
        select: { value: true },
      }),
      prisma.fieldValueAttachment.count({
        where: {
          organizationId,
          fieldValue: { fieldId: columnId, record: { isDeleted: false } },
        },
      }),
    ]);

    const populated =
      values.filter((row) => row.value?.trim()).length + attachmentCount;

    if (populated > 0) {
      throw new BadRequestException(
        `"${field.fieldName}" still holds data on ${populated} record(s). Clear those values before deleting the column.`
      );
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
   * Geocode a location string via Amazon Location Service.
   * Runs OUTSIDE the transaction to avoid timeout from external HTTP calls.
   */
  private async geocodeLocation(
    location_name: string,
    recordId: string,
    fieldId: string
  ) {
    if (location_name === "") return { cleared: true } as const;

    const existing = await prisma.fieldValue.findUnique({
      where: { recordId_fieldId: { recordId: recordId, fieldId: fieldId } },
      select: { value: true },
    });

    if (existing?.value === location_name) {
      return { cached: true, address: location_name } as const;
    }

    const response = await geoPlaces.send(
      new GeocodeCommand({
        QueryText: location_name,
        MaxResults: 1,
        IntendedUse: "Storage",
        Filter: { IncludeCountries: ["USA"] },
      })
    );

    const result = response.ResultItems?.[0];

    if (!result) {
      throw new Error("No geocoding result found");
    }

    const components = toComponents(result.Address);

    return {
      geocoded: true,
      address: result.Address?.Label ?? result.Title ?? location_name,
      city: components.city || null,
      state: components.state || null,
      zip: components.zipCode,
      county: components.county || null,
      country: result.Address?.Country?.Name ?? null,
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

    // Lead and referral both own a "County" field, so an unscoped lookup would
    // write the other module's field onto this record.
    const record = await tx.board.findUniqueOrThrow({
      where: { id: recordId },
      select: { moduleId: true },
    });

    if ("cleared" in geocodeResult) {
      const fields = await tx.field.findMany({
        where: {
          fieldName: { in: locationFieldNames },
          isDeleted: false,
          organizationId: organizationId,
          moduleId: record.moduleId,
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
      return {
        Address: null,
        City: null,
        State: null,
        "Zip Code": null,
        County: null,
        Country: null,
      };
    }

    if ("cached" in geocodeResult) {
      return { Address: location_name };
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
        moduleId: record.moduleId,
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
      // filter(Boolean) does not narrow, so the array still reads as possibly
      // holding nulls and Promise.all looks like it aggregates non-promises.
      .filter((upsert) => upsert !== null);

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
    organizationId: string,
    userId: string,
    color?: string
  ) {
    const field = await prisma.field.findFirst({
      where: { id: fieldId, organizationId },
      select: { organizationId: true, fieldName: true, moduleType: true },
    });

    if (!field) throw new NotFoundException("Field not found");

    return await prisma.fieldOption.create({
      data: {
        optionName: optionName,
        fieldId: fieldId,
        organizationId: field.organizationId,
        createdBy: userId,
        ...(color && { color }),
      },
    });
  }

  // Creates the columns the user approved in the mapping step and returns
  // header -> field id. Field has no unique constraint, so a name that already
  // exists reuses that field rather than adding a near-duplicate to the schema.
  private async createImportColumns(
    newColumns: {
      header: string;
      fieldName: string;
      fieldType: BoardFieldType;
    }[],
    existing: { id: string; fieldName: string; fieldOrder: number }[],
    moduleType: string,
    moduleId: string,
    organizationId: string
  ) {
    if (newColumns.length === 0) return { map: {}, createdNames: [] };

    // This controller has no ZodValidationPipe, so the body arrived unchecked.
    const parsed = CsvNewColumnsSchema.safeParse(newColumns);
    if (!parsed.success) {
      throw new BadRequestException(
        "New columns must each supply a header, a name, and an importable field type"
      );
    }
    newColumns = parsed.data;

    const byName = new Map(
      existing.map((field) => [field.fieldName.trim().toLowerCase(), field.id])
    );
    const createdMap: Record<string, string> = {};
    // Names of fields this import actually created, so the UI can say which.
    const createdNames: string[] = [];
    let nextOrder =
      existing.reduce((max, field) => Math.max(max, field.fieldOrder), 0) + 1;

    for (const column of newColumns) {
      const key = column.fieldName.trim().toLowerCase();
      const reused = byName.get(key);

      if (reused) {
        createdMap[column.header] = reused;
        continue;
      }

      const field = await prisma.field.create({
        data: {
          fieldName: column.fieldName.trim(),
          fieldType: column.fieldType,
          fieldOrder: nextOrder,
          organizationId,
          moduleType: toModuleType(moduleType),
          moduleId,
        },
        select: { id: true, fieldName: true, fieldType: true },
      });

      nextOrder += 1;
      byName.set(key, field.id);
      createdMap[column.header] = field.id;
      createdNames.push(field.fieldName);

      this.boardGateway.emitColumnCreated(
        organizationId,
        { id: field.id, name: field.fieldName, type: field.fieldType },
        moduleType
      );
    }

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    return { map: createdMap, createdNames };
  }

  async createRecordDataFromCSV(
    excelData: Record<string, unknown>[],
    organizationId: string,
    moduleType: string,
    userId: string,
    columnMap: Record<string, string>,
    nameColumn: string,
    newColumns: {
      header: string;
      fieldName: string;
      fieldType: BoardFieldType;
    }[] = []
  ) {
    // Validate the module up front so a bad moduleType 404s on the request
    // instead of failing silently deep inside the queue worker.
    const moduleId = await resolveModuleId(moduleType, organizationId);

    const headers = new Set(excelData.flatMap((row) => Object.keys(row)));

    if (!headers.has(nameColumn)) {
      throw new BadRequestException(
        `Naming column "${nameColumn}" is not a column in the uploaded file`
      );
    }

    // Only this module's live fields are mappable, so a stale or cross-tenant
    // id is rejected here rather than silently dropping its column on import.
    const fields = await prisma.field.findMany({
      where: { organizationId, moduleId, isDeleted: false },
      select: { id: true, fieldName: true, fieldOrder: true },
    });
    const fieldIds = new Set(fields.map((field) => field.id));

    const mapped = Object.entries(columnMap).filter(([header]) =>
      headers.has(header)
    );

    const unknownField = mapped.find(([, fieldId]) => !fieldIds.has(fieldId));
    if (unknownField) {
      throw new BadRequestException(
        `Column "${unknownField[0]}" is mapped to a field that does not exist on this module`
      );
    }

    const created = await this.createImportColumns(
      newColumns.filter((column) => headers.has(column.header)),
      fields,
      moduleType,
      moduleId,
      organizationId
    );

    if (mapped.length + Object.keys(created.map).length === 0) {
      throw new BadRequestException(
        "Map at least one column to a field before importing"
      );
    }

    // A created column wins: the user picked "create" for that header after
    // seeing whatever the auto-match had proposed.
    const scopedColumnMap = { ...Object.fromEntries(mapped), ...created.map };

    const job = await this.csvImportQueue.add("import", {
      excelData,
      organizationId,
      moduleType,
      userId,
      columnMap: scopedColumnMap,
      nameColumn,
    });

    return {
      jobId: job.id,
      queuedRows: excelData.length,
      createdColumns: created.createdNames,
      // Named so the UI can say what it skipped instead of implying a total.
      ignoredColumns: [...headers].filter(
        (header) => !(header in scopedColumnMap)
      ),
    };
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

  // History.organizationId is nullable, so ownership goes through the Board
  // relation, whose organizationId is required.
  async updateRecordHistory(recordId: string, organizationId: string) {
    return await prisma.history.updateMany({
      where: { id: recordId, record: { organizationId } },
      data: { createdAt: new Date() },
    });
  }

  async updateContactValue(
    fieldId: string,
    body: UpdateContactDto,
    organizationId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const field = await tx.field.findFirst({
        where: { id: fieldId, organizationId },
        select: {
          values: {
            select: { id: true, value: true },
          },
        },
      });

      if (!field) throw new NotFoundException("Field not found");

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

  async getFieldAttachments(
    recordId: string,
    fieldId: string,
    organizationId: string
  ) {
    const field = await prisma.field.findFirst({
      where: { id: fieldId, organizationId, isDeleted: false },
      select: { id: true, fieldType: true },
    });
    if (!field) throw new NotFoundException("Field not found");

    const fieldValue = await prisma.fieldValue.findUnique({
      where: { recordId_fieldId: { recordId, fieldId } },
      select: {
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            fileKey: true,
            createdAt: true,
            uploadedBy: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return (fieldValue?.attachments ?? []).map((a) => ({
      ...a,
      url: privateViewUrl(a.fileKey),
    }));
  }

  async uploadAttachment(
    recordId: string,
    fieldId: string,
    file: Express.Multer.File,
    organizationId: string,
    memberId: string,
    moduleType: string
  ) {
    const field = await prisma.field.findFirst({
      where: { id: fieldId, organizationId, isDeleted: false },
      select: { id: true, fieldType: true, fieldName: true },
    });
    if (!field) throw new NotFoundException("Field not found");
    if (field.fieldType !== BoardFieldType.ATTACHMENT) {
      throw new BadRequestException("Field is not an attachment field");
    }

    // Store result.public_id (the raw S3 key), never result.url or
    // result.secure_url: those are already privateViewUrl(key) for private
    // visibility, and re-wrapping them later would double-wrap the link.
    const { public_id: fileKey } = await this.imageService.uploadImage(
      file,
      organizationId,
      "private"
    );

    const { attachment, attachmentCount } = await prisma.$transaction(
      async (tx) => {
        const fieldValue = await tx.fieldValue.upsert({
          where: { recordId_fieldId: { recordId, fieldId } },
          update: {},
          create: { recordId, fieldId, value: null, organizationId },
        });

        const attachment = await tx.fieldValueAttachment.create({
          data: {
            fieldValueId: fieldValue.id,
            organizationId,
            fileName: file.originalname,
            fileKey,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedBy: memberId,
          },
        });

        const attachmentCount = await tx.fieldValueAttachment.count({
          where: { fieldValueId: fieldValue.id },
        });

        await this.createRecordHistory(
          recordId,
          "",
          file.originalname,
          memberId,
          tx,
          "update",
          field.fieldName,
          field.id
        );

        return { attachment, attachmentCount };
      }
    );

    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );

    // Emit the count as a STRING to match every other field's wire type.
    this.boardGateway.emitRecordValueUpdated(
      organizationId,
      recordId,
      field.fieldName,
      String(attachmentCount),
      moduleType
    );

    return { ...attachment, url: privateViewUrl(fileKey) };
  }

  async deleteAttachment(
    attachmentId: string,
    organizationId: string,
    moduleType: string
  ) {
    const attachment = await prisma.fieldValueAttachment.findFirst({
      where: { id: attachmentId, organizationId },
      select: {
        id: true,
        fileKey: true,
        fieldValueId: true,
        fieldValue: {
          select: { recordId: true, field: { select: { fieldName: true } } },
        },
      },
    });
    if (!attachment) throw new NotFoundException("Attachment not found");

    await this.imageService.deleteImage(attachment.fileKey, organizationId);

    const attachmentCount = await prisma.$transaction(async (tx) => {
      await tx.fieldValueAttachment.delete({ where: { id: attachmentId } });
      return tx.fieldValueAttachment.count({
        where: { fieldValueId: attachment.fieldValueId },
      });
    });

    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );

    this.boardGateway.emitRecordValueUpdated(
      organizationId,
      attachment.fieldValue.recordId,
      attachment.fieldValue.field.fieldName,
      String(attachmentCount),
      moduleType
    );

    return { result: "ok" };
  }

  async deleteRecordHistory(timelineId: string, organizationId: string) {
    const timeline = await prisma.history.findFirst({
      where: { id: timelineId, record: { organizationId } },
      select: { id: true },
    });
    if (!timeline) throw new NotFoundException("Timeline not found");

    return await prisma.history.delete({ where: { id: timelineId } });
  }

  // FieldOption.organizationId is nullable, so ownership goes through Field.
  // Never a hard delete: records already hold this option's value, so binning
  // it has to be reversible.
  async deleteRecordFieldOption(
    optionId: string,
    organizationId: string,
    userId: string
  ) {
    const option = await prisma.fieldOption.findFirst({
      where: { id: optionId, field: { organizationId } },
      select: { id: true, isDeleted: true },
    });
    if (!option) throw new NotFoundException("Field option not found");
    if (option.isDeleted) {
      throw new BadRequestException("Field option is already in the trash");
    }

    return await prisma.fieldOption.update({
      where: { id: optionId },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
    });
  }

  // The trash for one field, newest first. deletedBy is resolved to a name so
  // the list can say who binned each one.
  async getDeletedRecordFieldOptions(fieldId: string, organizationId: string) {
    const field = await prisma.field.findFirst({
      where: { id: fieldId, organizationId },
      select: { id: true },
    });
    if (!field) throw new NotFoundException("Field not found");

    return prisma.fieldOption.findMany({
      where: { fieldId, isDeleted: true },
      orderBy: [{ deletedAt: "desc" }, { optionName: "asc" }],
      select: {
        id: true,
        optionName: true,
        color: true,
        deletedAt: true,
        deleter: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  // Restoring clears the attribution: who binned it is only meaningful while
  // it is binned, and a stale deletedBy would misattribute the next delete.
  async restoreRecordFieldOption(optionId: string, organizationId: string) {
    const option = await prisma.fieldOption.findFirst({
      where: { id: optionId, field: { organizationId } },
      select: { id: true, isDeleted: true },
    });
    if (!option) throw new NotFoundException("Field option not found");
    if (!option.isDeleted) {
      throw new BadRequestException("Field option is not in the trash");
    }

    return prisma.fieldOption.update({
      where: { id: optionId },
      data: { isDeleted: false, deletedAt: null, deletedBy: null },
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

    for (const recordId of column_ids) {
      await this.boardNotify.notifyRecord({
        recordId,
        organizationId,
        moduleType,
        actorUserId: memberId,
        event: BOARD_NOTIFICATION_EVENT.DELETED,
        title: (recordName) => `${recordName} was deleted`,
      });
    }
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
    limit: number = 15,
    activityType?: string,
    status?: string
  ) {
    const offset = (page - 1) * limit;
    const where: Prisma.ActivityWhereInput = {
      recordId: recordId,
      organizationId: organizationId,
      ...(activityType && { activityType: activityType as ActivityType }),
      ...(status && { status: status as ActivityStatus }),
    };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          creator: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activity.count({ where }),
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

    const record = await prisma.board.findFirstOrThrow({
      where: { id: recordId, organizationId: organizationId },
      select: { moduleType: true, module: { select: { key: true } } },
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

    await this.boardNotify.notifyRecord({
      recordId,
      organizationId,
      moduleType: record.module?.key ?? record.moduleType,
      actorUserId: userId,
      event: BOARD_NOTIFICATION_EVENT.ACTIVITY_LOGGED,
      title: (recordName) => `${activity.activityType} logged on ${recordName}`,
      body: activity.title,
    });

    // EMAIL activities are logged on completion, when the mail actually goes out.
    if (activity.activityType !== "EMAIL") {
      await this.liaisonActivity.logRecordActivity({
        recordId,
        organizationId,
        userId,
        activityType: activity.activityType,
      });
    }

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
    const record = await prisma.board.findFirstOrThrow({
      where: { id: data.recordId, organizationId: organizationId },
      select: { moduleType: true, module: { select: { key: true } } },
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

    await this.boardNotify.notifyRecord({
      recordId: data.recordId,
      organizationId,
      moduleType: record.module?.key ?? record.moduleType,
      actorUserId: userId,
      event: BOARD_NOTIFICATION_EVENT.FAX_SENT,
      title: (recordName) => `Fax sent for ${recordName}`,
      body: activity.title,
    });

    await this.liaisonActivity.logRecordActivity({
      recordId: data.recordId,
      organizationId,
      userId,
      activityType: activity.activityType,
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
        record: {
          select: {
            recordName: true,
            moduleType: true,
            module: { select: { key: true } },
          },
        },
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
        layout: "ACTIVITY",
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

    await this.boardNotify.notifyRecord({
      recordId: activity.recordId,
      organizationId,
      moduleType: activity.record.module?.key ?? activity.record.moduleType,
      actorUserId: userId,
      event: BOARD_NOTIFICATION_EVENT.ACTIVITY_COMPLETED,
      title: (recordName) => `Activity completed on ${recordName}`,
      body: activity.title,
    });

    // An EMAIL activity only reaches the recipient on completion, so that is
    // where the liaison touchpoint belongs rather than at creation.
    if (activity.activityType === "EMAIL") {
      await this.liaisonActivity.logRecordActivity({
        recordId: activity.recordId,
        organizationId,
        userId,
        activityType: activity.activityType,
      });
    }

    return updated;
  }

  async updateActivity(
    activityId: string,
    organizationId: string,
    userId: string,
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
    const existingActivity = await prisma.activity.findFirstOrThrow({
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

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
    });

    // An EMAIL activity only reaches the recipient on completion, so that is
    // where the liaison touchpoint belongs rather than at creation.
    if (
      existingActivity.activityType === "EMAIL" &&
      existingActivity.status !== "COMPLETED" &&
      data.status === "COMPLETED"
    ) {
      await this.liaisonActivity.logRecordActivity({
        recordId: existingActivity.recordId,
        organizationId,
        userId,
        activityType: existingActivity.activityType,
      });
    }

    return updated;
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
    const scopedModuleId = await resolveModuleId(moduleType, organizationId);
    if (!email && !phone) {
      return { duplicates: [] };
    }

    const fields = await prisma.field.findMany({
      where: {
        organizationId,
        moduleId: scopedModuleId,
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
