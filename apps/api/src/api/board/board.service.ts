import { formatPhoneNumber } from "@dashboard/shared";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BoardFieldType, Prisma } from "@prisma/client";
import { Queue, QueueEvents } from "bullmq";
import { appConfig } from "src/config/app-config";
import { gemini } from "src/lib/gemini/gemini";
import { businessCardScanPrompt, followUpPrompt } from "src/lib/gemini/prompt";
import { cacheData, getData, purgeAllCacheKeys } from "src/lib/redis/redis";
import { sendEmail } from "src/lib/resend/resend";
import { ActivityEmail } from "src/react-email/activity-email";
import { v4 as uuidv4 } from "uuid";
import { lookupByName } from "zipcodes-perogi";
import { CACHE_PREFIX } from "../../lib/constant";
import { prisma } from "../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { BoardGateway } from "./board.gateway";
import { UpdateContactDto } from "./dto/board.schema";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

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

@Injectable()
export class BoardService {
  private readonly geminiQueueEvents: QueueEvents;

  constructor(
    private readonly boardGateway: BoardGateway,
    private readonly gmailService: GmailService,
    private readonly outlookService: OutlookService,
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
      moduleType: moduleType,
      AND: [],
    };

    if (boardDateFrom || boardDateTo) {
      where.AND = [
        ...(where.AND as Prisma.BoardWhereInput[]),
        {
          createdAt: {
            ...(boardDateFrom && { gte: new Date(boardDateFrom) }),
            ...(boardDateTo && { lte: new Date(boardDateTo) }),
          },
        },
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND as Prisma.BoardWhereInput[]),
        {
          OR: [
            {
              recordName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              values: {
                some: {
                  value: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        },
      ];
    }

    if (filter && Object.keys(filter).length > 0) {
      const filterFieldIds = Object.keys(filter).filter(
        (key) => filter[key] !== undefined && filter[key] !== ""
      );

      const filterFields = await prisma.field.findMany({
        where: {
          id: { in: filterFieldIds },
          organizationId: organizationId,
          moduleType: moduleType,
          isDeleted: false,
        },
        select: { id: true, fieldType: true, fieldName: true },
      });

      const fieldTypeMap = new Map(
        filterFields.map((f) => [f.id, f.fieldType])
      );

      for (const [id, val] of Object.entries(filter)) {
        if (val === undefined || val === "") continue;

        const fieldType = fieldTypeMap.get(id);
        const useExactMatch =
          fieldType &&
          (fieldType === "DROPDOWN" ||
            fieldType === "STATUS" ||
            fieldType === "CHECKBOX");

        where.AND = [
          ...(where.AND as Prisma.BoardWhereInput[]),
          {
            values: {
              some: {
                fieldId: id,
                value: useExactMatch
                  ? { equals: String(val), mode: "insensitive" }
                  : { contains: String(val), mode: "insensitive" },
              },
            },
          },
        ];
      }
    }
    // Determine if sorting by a static Board field or a dynamic field
    const staticSortFields = ["recordName", "createdAt"];
    const isStaticSort = !sortBy || staticSortFields.includes(sortBy);
    const order = sortOrder === "desc" ? "desc" : "asc";

    const orderBy: Prisma.BoardOrderByWithRelationInput = isStaticSort
      ? { [sortBy || "recordName"]: order }
      : { createdAt: "desc" }; // default for dynamic field sort (re-sorted after fetch)

    const [boards, count, fields] = await Promise.all([
      prisma.board.findMany({
        where,
        skip: offset,
        take: Number(limit),
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
        orderBy,
      }),
      prisma.board.count({ where }),
      prisma.field.findMany({
        where: {
          organizationId: organizationId,
          moduleType: moduleType,
          isDeleted: false,
        },
        orderBy: { fieldOrder: "asc" },
      }),
    ]);

    const formatted = boards.map((b) => {
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
        ...dynamicData,
      };
    });

    // Sort by dynamic field (field name) within the current page
    if (sortBy && !isStaticSort) {
      const sortField = fields.find((f) => f.id === sortBy);
      if (sortField) {
        formatted.sort((a, b) => {
          const valA = (a as Record<string, any>)[sortField.fieldName] ?? "";
          const valB = (b as Record<string, any>)[sortField.fieldName] ?? "";
          const cmp = String(valA).localeCompare(String(valB), undefined, {
            numeric: true,
            sensitivity: "base",
          });
          return order === "desc" ? -cmp : cmp;
        });
      }
    }

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

  async getAllRecordHistory(organizationId: string, filters: HistoryFilters) {
    const { page = 1, limit = 50, moduleType } = filters;
    const offset = (page - 1) * Number(limit);
    const where: Prisma.HistoryWhereInput = {
      record: {
        organizationId: organizationId,
        moduleType: moduleType,
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

  async getFollowUpSuggestions(recordId: string, organizationId: string) {
    const cacheKey = `followup:${recordId}`;
    const cached = await getData(cacheKey);
    if (cached) return cached;

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
        moduleType: moduleType,
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
        moduleType: moduleType,
        isDeleted: false,
      },
    });

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
        moduleType: moduleType,
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
          where: {
            value: decodeURI(value),
          },
          select: {
            contactValue: true,
          },
        },
      },
    });

    if (!data) {
      return { contactNumber: "", email: "", address: "" };
    }

    const valueItem = data.values[0];
    if (!valueItem || !valueItem.contactValue) {
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
      assignedTo: c.boardCountyAssignedTo.map((a) => a.assignedTo),
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

    let where: Prisma.FieldOptionFindManyArgs = {
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
    reason?: string
  ) {
    try {
      // Handle LOCATION separately: geocode BEFORE the transaction so the
      // external HTTP call doesn't hold the transaction open and cause timeouts.
      if (fieldId !== BoardFieldType.ASSIGNED_TO && fieldId !== "Record") {
        const field = await prisma.field.findUnique({
          where: { id: fieldId, organizationId: organizationId },
          select: { fieldType: true, id: true, fieldName: true },
        });

        if (!field) throw new NotFoundException("Field not found");

        if (field.fieldType === BoardFieldType.LOCATION) {
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

          await purgeAllCacheKeys(
            `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
          );

          this.boardGateway.emitRecordValueLocation(
            organizationId,
            recordId,
            { ...locationData },
            moduleType
          );

          return { message: "Location updated successfully" };
        }
      }

      const recordValue = await prisma.$transaction(async (tx) => {
        if (fieldId === BoardFieldType.ASSIGNED_TO) {
          await this.updateAssignedTo(tx, recordId, value, memberId);
          await purgeAllCacheKeys(
            `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
          );

          this.boardGateway.emitRecordValueUpdated(
            organizationId,
            recordId,
            "Assigned To",
            value,
            moduleType
          );

          return {
            message: "Assigned to updated successfully",
          };
        }

        if (fieldId === "Record") {
          await this.updateRecordName(tx, recordId, value, memberId);

          await purgeAllCacheKeys(
            `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
          );

          this.boardGateway.emitRecordValueUpdated(
            organizationId,
            recordId,
            "Record",
            value,
            moduleType
          );

          return {
            message: "Record name updated successfully",
          };
        }

        const field = await tx.field.findUnique({
          where: {
            id: fieldId,
            organizationId: organizationId,
            isDeleted: false,
            moduleType: moduleType,
          },
          select: {
            fieldType: true,
            id: true,
            fieldName: true,
          },
        });

        if (!field) throw new NotFoundException("Field not found");

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
            },
          });

          await purgeAllCacheKeys(
            `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
          );

          return {
            message: "Multiselect updated successfully",
          };
        }

        if (field.fieldName === "County" && moduleType === "REFERRAL") {
          const [assignedTo, facilityField] = await Promise.all([
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
                  take: 1,
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
            },
          });

          await tx.fieldValue.upsert({
            where: {
              recordId_fieldId: {
                recordId: recordId,
                fieldId: facilityField.id,
              },
            },
            update: {
              value: assignedTo.boardCountyAssignedTo[0].assignedTo,
            },
            create: {
              recordId: recordId,
              fieldId: facilityField.id,
              value: assignedTo.boardCountyAssignedTo[0].assignedTo,
            },
          });

          await purgeAllCacheKeys(
            `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
          );

          return {
            message: "County assigned successfully",
          };
        }

        if (field.fieldType === BoardFieldType.STATUS) {
          const statusFields = await tx.field.findMany({
            where: {
              fieldName: {
                in: ["Reason", "Action Date (Accepted / Rejected)"],
              },
              isDeleted: false,
              organizationId: organizationId,
              moduleType: moduleType,
            },
            select: { id: true, fieldName: true },
          });

          const reasonField = statusFields.find(
            (f) => f.fieldName === "Reason"
          );
          const actionDateField = statusFields.find(
            (f) => f.fieldName === "Action Date (Accepted / Rejected)"
          );

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
              },
            });
          }

          const reasonData = { id: reasonField?.id ?? "", value: reason ?? "" };

          const actionDateData = {
            id: actionDateField?.id ?? "",
            value: now ?? "",
          };

          await purgeAllCacheKeys(
            `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
          );

          this.boardGateway.emitRecordValueStatusUpdated(
            organizationId,
            recordId,
            field.id,
            value,
            moduleType,
            reasonData,
            actionDateData
          );
          return {
            message: "Status updated successfully",
          };
        }

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
          create: { recordId: recordId, fieldId: field.id, value },
        });

        await this.createRecordHistory(
          recordId,
          existingRecordValue?.value ?? "",
          value,
          memberId,
          tx,
          "update",
          field.fieldName
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
      });

      return recordValue;
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  async scanBusinessCard(
    file: Express.Multer.File,
    organizationId: string,
    moduleType: string
  ) {
    const fields = await prisma.field.findMany({
      where: {
        organizationId: organizationId,
        moduleType: moduleType,
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

    const result = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: { mimeType: file.mimetype, data: base64Image },
            },
            { text: businessCardScanPrompt(fieldDescriptions) },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(result.text ?? "{}");

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
      const board = await tx.board.create({
        data: {
          recordName: recordName ?? "",
          organizationId: organizationId,
          moduleType: moduleType,
        },
      });

      const fields = await tx.field.findMany({
        where: {
          organizationId: organizationId,
          moduleType: moduleType,
          isDeleted: false,
        },
      });

      const fieldValues = fields.map((f) => ({
        recordId: board.id,
        fieldId: f.id,
        value: initialValues?.[f.id] ?? null,
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
              contactNumber: formatPhoneNumber(
                personContact.contactNumber ?? ""
              ),
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
        },
      });

      await tx.boardNotificationState.create({
        data: {
          recordId: board.id,
          lastSeen: new Date(),
        },
      });

      return board;
    });

    await purgeAllCacheKeys(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:*`
    );
    this.boardGateway.emitRecordCreated(organizationId, record, moduleType);

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
          moduleType: moduleType,
          isDeleted: false,
        },
        orderBy: { fieldOrder: "asc" },
      });

      const createdReferrals: any = [];
      const allReferralValues: any[] = [];
      const allHistoryEntries: any[] = [];
      const allNotificationStates: any[] = [];

      for (const referralData of referralItems) {
        const referral = await tx.board.create({
          data: {
            recordName: referralData.referral_name ?? "",
            moduleType: moduleType,
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
            } else {
              value = String(customValue);
            }
          }

          allReferralValues.push({
            id: uuidv4(),
            recordId: referral.id,
            fieldId: field.id,
            value: value,
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
          column: "Referral Name",
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

      return {
        message: `${createdReferrals.length} referral(s) created successfully`,
        count: createdReferrals.length,
        referrals: createdReferrals,
      };
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    for (const referral of result.referrals) {
      this.boardGateway.emitRecordCreated(organizationId, referral, "REFERRAL");
    }

    return result;
  }

  async createCountyAssignment(
    name: string,
    organizationId: string,
    assignedTo: string
  ) {
    await prisma.boardCounty.create({
      data: {
        countyName: name,
        organizationId: organizationId,
        boardCountyAssignedTo: {
          create: {
            assignedTo: assignedTo,
          },
        },
      },
    });

    return {
      message: "County assignment created successfully",
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

      const field = await prisma.field.findFirstOrThrow({
        where: {
          fieldName: history.column ?? "",
          organizationId: organizationId,
          isDeleted: false,
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
            createdBy: userId,
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
            createdBy: userId,
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
        moduleType: moduleType,
        isDeleted: false,
      },
      orderBy: { fieldOrder: "desc" },
    });

    const newOrder = lastColumn ? lastColumn.fieldOrder + 1 : 1;

    await prisma.field.create({
      data: {
        fieldName: column_name,
        fieldType: fieldType,
        fieldOrder: newOrder,
        organizationId: organizationId,
        moduleType: moduleType,
      },
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitColumnCreated(
      organizationId,
      column_name,
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
    return await prisma.fieldOption.create({
      data: {
        optionName: optionName,
        fieldId: fieldId,
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
    column?: string
  ) {
    return await tx.history.create({
      data: {
        recordId: recordId,
        oldValue: oldValue,
        newValue: newValue,
        action: action ?? "create",
        createdBy: createdBy,
        column: column,
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
            where: { value: body.value },
            select: { id: true },
          },
        },
      });

      return await tx.fieldPersonInformation.upsert({
        where: { fieldValueId: field.values[0].id },
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

  async deleteCountyAssignment(countyId: string) {
    const county = await prisma.boardCounty.findUnique({
      where: { id: countyId },
      include: {
        boardCountyAssignedTo: true,
      },
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

  async deleteRecord(column_ids: string[], organizationId: string) {
    const record = await prisma.board.findMany({
      where: { id: { in: column_ids } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.board.updateMany({
        where: { id: { in: record.map((r) => r.id) } },
        data: { isDeleted: true },
      });
    });
    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);
  }

  private async sendEmailWithProvider(
    userId: string,
    to: string,
    subject: string,
    recipientName: string,
    body: string,
    senderName: string,
    sendVia?: string
  ): Promise<string> {
    const gmailStatus = await this.gmailService.getConnectionStatus(userId);
    const outlookStatus = await this.outlookService.getConnectionStatus(userId);

    if (sendVia === "GMAIL") {
      const sent = await this.gmailService.trySendViaGmail(
        userId,
        to,
        subject,
        recipientName,
        body,
        senderName
      );
      if (sent && gmailStatus.email) return gmailStatus.email;
      await sendEmail({
        to,
        subject,
        html: ActivityEmail({ recipientName, body }),
        from: appConfig.APP_EMAIL,
      });
      return appConfig.APP_EMAIL;
    }

    if (sendVia === "OUTLOOK") {
      const sent = await this.outlookService.trySendViaOutlook(
        userId,
        to,
        subject,
        recipientName,
        body,
        senderName
      );
      if (sent && outlookStatus.email) return outlookStatus.email;
      await sendEmail({
        to,
        subject,
        html: ActivityEmail({ recipientName, body }),
        from: appConfig.APP_EMAIL,
      });
      return appConfig.APP_EMAIL;
    }

    // AUTO: Gmail → Outlook → Resend
    const sentViaGmail = await this.gmailService.trySendViaGmail(
      userId,
      to,
      subject,
      recipientName,
      body,
      senderName
    );
    if (sentViaGmail && gmailStatus.email) return gmailStatus.email;

    const sentViaOutlook = await this.outlookService.trySendViaOutlook(
      userId,
      to,
      subject,
      recipientName,
      body,
      senderName
    );
    if (sentViaOutlook && outlookStatus.email) return outlookStatus.email;

    await sendEmail({
      to,
      subject,
      html: ActivityEmail({ recipientName, body }),
      from: appConfig.APP_EMAIL,
    });
    return appConfig.APP_EMAIL;
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

      const senderEmail = await this.sendEmailWithProvider(
        userId,
        recipientEmail,
        subject,
        activity.record.recordName,
        body,
        activity.creator.name,
        emailOverrides?.send_via
      );

      updateData.emailSentAt = new Date();
      updateData.recipientEmail = recipientEmail;
      updateData.emailSubject = subject;
      updateData.emailBody = body;
      updateData.senderEmail = senderEmail;
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
