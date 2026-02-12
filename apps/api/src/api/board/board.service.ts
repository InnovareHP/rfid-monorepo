import { normalizeKey, normalizeOptionValue } from "@dashboard/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { BoardFieldType, Field, FieldOption, Prisma } from "@prisma/client";
import { appConfig } from "src/config/app-config";
import { isSelectType } from "src/lib/helper";
import { cacheData, getData, purgeAllCacheKeys } from "src/lib/redis/redis";
import { lookupByName } from "zipcodes-perogi";
import { uuidv4 } from "zod";
import { CACHE_PREFIX } from "../../lib/constant";
import { prisma } from "../../lib/prisma/prisma";
import { BoardGateway } from "./board.gateway";

interface BoardFilters {
  filter?: Record<string, string>;
  boardDateFrom?: string;
  boardDateTo?: string;
  page?: number;
  limit?: number;
  search?: string;
  moduleType?: string;
}

interface HistoryFilters {
  page?: number;
  limit?: number;
  moduleType: string;
}

@Injectable()
export class BoardService {
  constructor(private readonly boardGateway: BoardGateway) {}
  async getAllBoards(organizationId: string, filters: BoardFilters) {
    const {
      boardDateFrom,
      boardDateTo,
      page = 1,
      limit = 50,
      filter,
      search,
      moduleType,
    } = filters;

    const cachedData = await getData(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:${boardDateFrom}:${boardDateTo}:${page}:${limit}:${search}:${JSON.stringify(filter)}`
    );

    if (cachedData) {
      return cachedData;
    }

    const offset = (page - 1) * Number(limit);

    const where: Prisma.BoardWhereInput = {
      organization_id: organizationId,
      is_deleted: false,
      module_type: moduleType,
      AND: [],
    };

    if (boardDateFrom || boardDateTo) {
      where.AND = [
        ...(where.AND as Prisma.BoardWhereInput[]),
        {
          created_at: {
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
          record_name: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (filter && Object.keys(filter).length > 0) {
      const filterFieldIds = Object.keys(filter).filter(
        (key) => filter[key] !== undefined && filter[key] !== ""
      );

      console.log(filterFieldIds);

      const filterFields = await prisma.field.findMany({
        where: { id: { in: filterFieldIds }, organization_id: organizationId },
        select: { id: true, field_type: true, field_name: true },
      });

      const fieldTypeMap = new Map(
        filterFields.map((f) => [f.id, f.field_type])
      );
      console.log(filterFields);

      for (const [id, val] of Object.entries(filter)) {
        if (val === undefined || val === "") continue;

        const fieldType = fieldTypeMap.get(id);
        const useExactMatch =
          fieldType &&
          (fieldType === "DROPDOWN" ||
            fieldType === "STATUS" ||
            fieldType === "CHECKBOX");

        console.log(id, val, useExactMatch);
        where.AND = [
          ...(where.AND as Prisma.BoardWhereInput[]),
          {
            values: {
              some: {
                field_id: id,
                value: useExactMatch
                  ? { equals: String(val), mode: "insensitive" }
                  : { contains: String(val), mode: "insensitive" },
              },
            },
          },
        ];
      }
    }
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
                  field_name: true,
                },
              },
              value: true,
            },
          },
          notifications: {
            take: 1,
          },
        },
        orderBy: { record_name: "asc" },
      }),
      prisma.board.count({ where }),
      prisma.field.findMany({
        where: { organization_id: organizationId },
        orderBy: { field_order: "asc" },
      }),
    ]);

    const formatted = boards.map((b) => {
      const dynamicData = b.values.reduce(
        (acc, curr) => {
          acc[curr.field.field_name] = curr.value;
          return acc;
        },
        {} as Record<string, string | null>
      );

      return {
        id: b.id,
        record_name: b.record_name,
        assigned_to: b.assigned_to,
        created_at: b.created_at,
        has_notification: b.notifications.length > 0,
        ...dynamicData,
      };
    });

    const data = {
      pagination: {
        page: Number(page),
        limit: Number(limit),
        count: count,
      },
      columns: fields.map((f) => ({
        id: f.id,
        name: f.field_name,
        type: f.field_type,
      })),
      data: formatted,
    };

    await cacheData(
      `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}:${boardDateFrom}:${boardDateTo}:${page}:${limit}:${search}:${JSON.stringify(filter)}`,
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
        organization_id: organizationId,
        module_type: moduleType,
      },
      action: { in: ["delete", "update", "restore"] },
    };
    const [history, total] = await Promise.all([
      prisma.history.findMany({
        where: where,
        orderBy: { created_at: "desc" },
        take: Number(limit),
        skip: offset,
        include: {
          user: {
            select: {
              user_name: true,
            },
          },
          record: {
            select: {
              record_name: true,
            },
          },
        },
      }),
      prisma.history.count({ where: where }),
    ]);
    const formatted = history.map((h) => {
      return {
        id: h.id,
        created_at: h.created_at,
        created_by: h.user?.user_name,
        action: h.action,
        record_name: h.record?.record_name,
        old_value: h.old_value,
        new_value: h.new_value,
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
        where: { record_id: recordId },
        include: {
          user: {
            select: {
              user_name: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: take,
        skip: offset,
      }),
      prisma.history.count({
        where: { record_id: recordId },
      }),
    ]);

    const formatted = history.map((h) => {
      return {
        id: h.id,
        created_at: h.created_at,
        created_by: h.user?.user_name,
        action: h.action,
        old_value: h.old_value,
        new_value: h.new_value,
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
        record_name: true,
        assigned_user: {
          select: {
            id: true,
            user_name: true,
          },
        },
      },
    });

    if (!record.assigned_user) {
      return {
        recordId,
        recordName: record.record_name,
        assignedTo: null,
        summary: null,
        message: "Lead is not yet assigned to a marketing member.",
      };
    }

    const where: Prisma.marketingWhereInput = {
      member: {
        user_table: {
          id: record.assigned_user.id,
        },
      },
    } as Prisma.marketingWhereInput;

    if (dateStartDate && dateEndDate) {
      where.createdAt = {
        gte: dateStartDate,
        lte: dateEndDate,
      };
    }

    if (record.record_name) {
      where.facility = {
        contains: record.record_name,
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
      recordName: record.record_name,
      assignedTo: record.assigned_user?.user_name ?? "Unknown",
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

  async getRecordById(
    recordId: string,
    organizationId: string,
    moduleType: string
  ) {
    const record = await prisma.board.findFirstOrThrow({
      where: {
        id: recordId,
        organization_id: organizationId,
        module_type: moduleType,
      },
      select: {
        id: true,
        created_at: true,
        record_name: true,
        assigned_user: {
          select: {
            user_name: true,
          },
        },
        values: {
          select: {
            field: {
              select: {
                field_name: true,
              },
            },
            value: true,
          },
        },
      },
    });

    const fields = await prisma.field.findMany({
      orderBy: { field_order: "asc" },
      where: { organization_id: organizationId },
    });

    const formatted = record.values.map((v) => {
      const dynamicData = record.values.reduce(
        (acc, curr) => {
          acc[curr.field.field_name] = curr.value;
          return acc;
        },
        {} as Record<string, string | null>
      );

      return {
        id: record.id,
        record_name: record.record_name,
        assigned_to: record.assigned_user?.user_name,
        created_at: record.created_at,
        ...dynamicData,
      };
    });
    return {
      columns: fields.map((f) => ({
        id: f.id,
        name: f.field_name,
        type: f.field_type,
      })),
      data: formatted,
    };
  }

  async getCountyConfiguration(organizationId: string) {
    const counties = await prisma.boardCounty.findMany({
      where: { organization_id: organizationId },
      select: {
        id: true,
        county_name: true,
        boardCountyAssignedTo: {
          select: {
            assigned_to: true,
          },
        },
      },
    });

    return counties.map((c) => ({
      id: c.id,
      name: c.county_name,
      assigned_to: c.boardCountyAssignedTo.map((a) => a.assigned_to),
    }));
  }

  async getRecordFieldOptions(
    fieldId: string,
    organizationId: string,
    page: number | null,
    limit: number | null
  ) {
    if (fieldId === BoardFieldType.ASSIGNED_TO) {
      const assignedTo = await prisma.member_table.findMany({
        where: {
          organizationId: organizationId,
        },
        select: {
          user_table: {
            select: {
              id: true,
              user_name: true,
            },
          },
        },
      });

      return assignedTo.map((a) => ({
        id: a.user_table.id,
        value: a.user_table.user_name,
      }));
    }

    let where: Prisma.FieldOptionFindManyArgs = {
      where: { field_id: fieldId, is_deleted: false },
    };

    if (page && limit) {
      where.skip = (page - 1) * limit;
      where.take = Number(limit);
      where.orderBy = { option_name: "asc" };
    }

    const options = await prisma.fieldOption.findMany(where);

    if (!page && !limit) {
      return options.map((o) => ({
        id: o.id,
        value: o.option_name,
      }));
    }

    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: {
        field_name: true,
      },
    });

    const total = await prisma.fieldOption.count({
      where: where.where,
    });

    return {
      field: field?.field_name,
      data: options.map((o) => ({
        id: o.id,
        value: o.option_name,
      })),
      total: total,
    };
  }

  async updateRecordValue(
    record_id: string,
    fieldId: string,
    value: string,
    organizationId: string,
    memberId: string,
    moduleType: string,
    reason?: string
  ) {
    try {
      const recordValue = await prisma.$transaction(async (tx) => {
        if (fieldId === BoardFieldType.ASSIGNED_TO) {
          await this.updateAssignedTo(tx, record_id, value, memberId);
          await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

          this.boardGateway.emitRecordValueUpdated(
            organizationId,
            record_id,
            "Assigned To",
            value
          );

          return {
            message: "Assigned to updated successfully",
          };
        }

        if (fieldId === "Record") {
          await this.updateRecordName(tx, record_id, value, memberId);

          await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

          this.boardGateway.emitRecordValueUpdated(
            organizationId,
            record_id,
            "Record",
            value
          );

          return {
            message: "Record name updated successfully",
          };
        }

        const field = await tx.field.findUnique({
          where: { id: fieldId, organization_id: organizationId },
          select: {
            field_type: true,
            id: true,
            field_name: true,
          },
        });

        if (!field) throw new NotFoundException("Field not found");

        if (field.field_type === BoardFieldType.LOCATION) {
          const locationData = await this.createLocation(
            value,
            record_id,
            organizationId
          );
          await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

          console.log(locationData);
          this.boardGateway.emitRecordValueLocation(organizationId, record_id, {
            ...locationData,
          });
          return {
            message: "Location updated successfully",
          };
        }

        if (field.field_type === BoardFieldType.MULTISELECT) {
          // Normalize value into an array of clean strings
          const normalizedValue = Array.isArray(value)
            ? value
            : typeof value === "string"
              ? value

                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
              : [];

          return await tx.fieldValue.upsert({
            where: {
              record_id_field_id: {
                record_id: record_id,
                field_id: field.id,
              },
            },
            update: {
              value: JSON.stringify(normalizedValue),
            },
            create: {
              record_id: record_id,
              field_id: field.id,
              value: JSON.stringify(normalizedValue),
            },
          });
        }

        if (field.field_name === "County" && moduleType === "REFERRAL") {
          const [assignedTo, facilityField] = await Promise.all([
            tx.boardCounty.findFirstOrThrow({
              where: {
                county_name: value,
                organization_id: organizationId,
              },
              include: {
                boardCountyAssignedTo: {
                  select: {
                    assigned_to: true,
                  },
                  take: 1,
                },
              },
            }),
            tx.field.findFirstOrThrow({
              where: {
                field_name: "Facility",
                organization_id: organizationId,
              },
              select: {
                id: true,
              },
            }),
          ]);

          // Save County value
          await tx.fieldValue.upsert({
            where: {
              record_id_field_id: {
                record_id: record_id,
                field_id: field.id,
              },
            },
            update: { value },
            create: {
              record_id: record_id,
              field_id: field.id,
              value,
            },
          });

          // Save Facility value
          await tx.fieldValue.upsert({
            where: {
              record_id_field_id: {
                record_id: record_id,
                field_id: facilityField.id,
              },
            },
            update: {
              value: assignedTo.boardCountyAssignedTo[0].assigned_to,
            },
            create: {
              record_id: record_id,
              field_id: facilityField.id,
              value: assignedTo.boardCountyAssignedTo[0].assigned_to,
            },
          });

          return {
            message: "County assigned successfully",
          };
        }

        if (field.field_name === "Status") {
          // Find the related "Reason" and "Action Date" fields
          const statusFields = await prisma.field.findMany({
            where: {
              field_name: {
                in: ["Reason", "Action Date (Accepted / Rejected)"],
              },
              organization_id: organizationId,
            },
            select: { id: true, field_name: true },
          });

          const reasonField = statusFields.find(
            (f) => f.field_name === "Reason"
          );
          const actionDateField = statusFields.find(
            (f) => f.field_name === "Action Date (Accepted / Rejected)"
          );

          await prisma.$transaction(async (tx) => {
            await tx.fieldValue.upsert({
              where: {
                record_id_field_id: {
                  record_id: record_id,
                  field_id: field.id,
                },
              },
              update: { value },
              create: {
                record_id: record_id,
                field_id: field.id,
                value,
              },
            });

            if (reason && reasonField) {
              await tx.fieldValue.upsert({
                where: {
                  record_id_field_id: {
                    record_id: record_id,
                    field_id: reasonField.id,
                  },
                },
                update: { value: reason },
                create: {
                  record_id: record_id,
                  field_id: reasonField.id,
                  value: reason,
                },
              });
            }

            // 3️⃣ Update Action Date (set to current timestamp)
            if (actionDateField) {
              const now = new Date().toISOString();

              await tx.fieldValue.upsert({
                where: {
                  record_id_field_id: {
                    record_id: record_id,
                    field_id: actionDateField.id,
                  },
                },
                update: { value: now },
                create: {
                  record_id: record_id,
                  field_id: actionDateField.id,
                  value: now,
                },
              });
            }
          });

          return {
            message: "Status updated successfully",
          };
        }

        const existingRecordValue = await prisma.fieldValue.findUnique({
          where: {
            record_id_field_id: { record_id: record_id, field_id: field.id },
          },
          select: { value: true },
        });

        const recordValue = await tx.fieldValue.upsert({
          where: {
            record_id_field_id: { record_id: record_id, field_id: field.id },
          },
          update: { value },
          create: { record_id: record_id, field_id: field.id, value },
        });

        await this.createRecordHistory(
          record_id,
          existingRecordValue?.value ?? "",
          value,
          memberId,
          "update",
          field.field_name
        );

        await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

        this.boardGateway.emitRecordValueUpdated(
          organizationId,
          record_id,
          field.field_name,
          value
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

  async createRecord(
    record_name: string,
    organizationId: string,
    memberId: string,
    moduleType: string
  ) {
    const record = await prisma.board.create({
      data: {
        record_name: record_name ?? "",
        organization_id: organizationId,
        module_type: moduleType,
      },
    });

    const fields = await prisma.field.findMany({
      where: { organization_id: organizationId },
    });
    await prisma.fieldValue.createMany({
      data: fields.map((f) => ({
        record_id: record.id,
        field_id: f.id,
        value: null,
      })),
    });

    await Promise.all([
      this.createRecordHistory(record.id, "", record_name, memberId, "create"),
      purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`),
    ]);

    this.boardGateway.emitRecordCreated(organizationId, record);

    return record;
  }

  async createReferral(
    data: { referral_name: string; [key: string]: any }[],
    organizationId: string,
    memberId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const fields = await tx.field.findMany({
        where: { organization_id: organizationId },
        orderBy: { field_order: "asc" },
      });

      const createdReferrals: any = [];
      const allReferralValues: any[] = [];
      const allHistoryEntries: any[] = [];
      const allNotificationStates: any[] = [];

      for (const referralData of data) {
        const referral = await tx.board.create({
          data: {
            record_name: referralData.referral_name ?? "",
            module_type: "REFERRAL",
            organization_id: organizationId,
          },
        });

        createdReferrals.push(referral);

        for (const field of fields) {
          const customValue =
            data[field.field_name] ?? data[field.field_name.toLowerCase()];
          let value: string | null = null;

          if (customValue !== undefined && customValue !== null) {
            // Handle MULTISELECT type
            if (field.field_type === BoardFieldType.MULTISELECT) {
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
            record_id: referral.id,
            field_id: field.id,
            value: value,
          });
        }

        // Prepare history entry
        allHistoryEntries.push({
          id: uuidv4(),
          created_at: new Date(),
          record_id: referral.id,
          old_value: null,
          new_value: referralData.referral_name,
          action: "create",
          created_by: memberId,
          column: "Referral Name",
        });

        allNotificationStates.push({
          id: uuidv4(),
          updated_at: new Date(),
          record_id: referral.id,
          last_seen: new Date(),
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
  }

  async createCountyAssignment(
    name: string,
    organizationId: string,
    assigned_to: string
  ) {
    await prisma.boardCounty.create({
      data: {
        county_name: name,
        organization_id: organizationId,
        boardCountyAssignedTo: {
          create: {
            assigned_to: assigned_to,
          },
        },
      },
    });

    return {
      message: "County assignment created successfully",
    };
  }

  async restoreRecord(
    record_id: string,
    history_id: string,
    organizationId: string,
    event_type: string,
    userId: string
  ) {
    const history = await prisma.history.findUniqueOrThrow({
      where: { id: history_id },
      select: {
        column: true,
        old_value: true,
        new_value: true,
        record_id: true,
      },
    });

    if (event_type === "update") {
      const record = await prisma.board.findUniqueOrThrow({
        where: { id: history.record_id },
        select: { is_deleted: true },
      });

      if (record.is_deleted) {
        throw new NotFoundException("Record is deleted");
      }

      const field = await prisma.field.findFirstOrThrow({
        where: {
          field_name: history.column ?? "",
          organization_id: organizationId,
        },
      });

      await prisma.$transaction(async (tx) => {
        await tx.fieldValue.update({
          where: {
            record_id_field_id: {
              record_id: history.record_id,
              field_id: field.id,
            },
          },
          data: { value: history.old_value },
        });
        await tx.history.create({
          data: {
            record_id: history.record_id,
            old_value: history.new_value,
            new_value: history.old_value,
            action: "restore",
            column: history.column,
            created_by: userId,
          },
        });
      });

      await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        history.record_id,
        history.column ?? "",
        history.old_value ?? ""
      );
      return {
        message: "Record restored successfully",
      };
    }

    if (event_type === "delete") {
      await prisma.$transaction(async (tx) => {
        await tx.board.update({
          where: { id: history.record_id },
          data: { is_deleted: Boolean(history.old_value) },
        });
        await tx.history.create({
          data: {
            record_id: history.record_id,
            old_value: history.new_value,
            new_value: history.old_value,
            action: "restore",
            column: history.column,
            created_by: userId,
          },
        });
      });

      await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

      this.boardGateway.emitRecordValueUpdated(
        organizationId,
        history.record_id,
        history.column ?? "",
        history.old_value ?? ""
      );
      return {
        message: "Record deleted successfully",
      };
    }
  }

  async setRecordNotificationState(record_id: string, organizationId: string) {
    const deleted = await prisma.boardNotificationState.deleteMany({
      where: { record_id: record_id },
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitRecordNotificationState(organizationId, record_id);

    return {
      message: "Notification marked as seen",
      deleted: deleted.count,
    };
  }

  async createColumn(
    column_name: string,
    field_type: BoardFieldType,
    organizationId: string
  ) {
    const lastColumn = await prisma.field.findFirst({
      where: { organization_id: organizationId },
      orderBy: { field_order: "desc" },
    });

    const newOrder = lastColumn ? lastColumn.field_order + 1 : 1;

    await prisma.field.create({
      data: {
        field_name: column_name,
        field_type: field_type,
        field_order: newOrder,
        organization_id: organizationId,
      },
    });

    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);

    this.boardGateway.emitColumnCreated(organizationId, column_name);
  }

  async createLocation(
    location_name: string,
    record_id: string,
    organizationId: string
  ) {
    if (location_name === "") {
      const fields = await prisma.field.findMany({
        where: {
          field_name: {
            in: ["Address", "City", "State", "Zip Code", "County", "Country"],
          },
          organization_id: organizationId,
        },
        select: { id: true, field_name: true },
      });
      await prisma.fieldValue.updateMany({
        where: {
          record_id: record_id,
          field_id: { in: fields.map((f) => f.id) },
        },
        data: { value: null },
      });

      return {
        address: null,
        isCached: true,
      };
    }

    const existing = await prisma.fieldValue.findFirst({
      where: { record_id: record_id },
      select: { value: true },
    });

    if (existing?.value === location_name) {
      return {
        address: location_name,
        isCached: true,
      };
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

    const locationData = {
      address: location_name,
      city: props.locality ? props.locality : null,
      state: props.region_a ? props.region_a : null,
      zip: lookupByName(props.locality, props.region_a)[0].zip,
      county: props.county ? props.county.replace(/ County/g, "") : null,
      country: props.country ? props.country : null,
    };

    const fields = await prisma.field.findMany({
      where: {
        field_name: {
          in: ["Address", "City", "State", "Zip Code", "County", "Country"],
        },
        organization_id: organizationId,
      },
      select: { id: true, field_name: true },
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
        const key = field.field_name.toLowerCase().replace(/\s+/g, "");

        const value = mapper[key];
        if (!value) return null;

        return prisma.fieldValue.upsert({
          where: {
            record_id_field_id: {
              record_id: record_id,
              field_id: field.id,
            },
          },
          update: { value },
          create: {
            record_id: record_id,
            field_id: field.id,
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
    record_id: string,
    value: string,
    memberId: string
  ) {
    const existingRecord = await tx.board.findUnique({
      where: { id: record_id },
      select: {
        assigned_to: true,
        assigned_user: {
          select: {
            user_name: true,
          },
        },
      },
    });

    await tx.board.update({
      where: { id: record_id },
      data: { assigned_to: value },
    });

    const newAssignedUser = await tx.user_table.findUniqueOrThrow({
      where: {
        id: value,
      },
      select: {
        user_name: true,
      },
    });

    await this.createRecordHistory(
      record_id,
      existingRecord?.assigned_user?.user_name ?? "",
      newAssignedUser.user_name ?? "",
      memberId,
      "update",
      "Assigned To"
    );
  }

  async updateRecordName(
    tx: Prisma.TransactionClient,
    record_id: string,
    value: string,
    memberId: string
  ) {
    const existingRecord = await prisma.board.findUnique({
      where: { id: record_id },
      select: { record_name: true },
    });

    await tx.board.update({
      where: { id: record_id },
      data: { record_name: value },
    });
    await this.createRecordHistory(
      record_id,
      existingRecord?.record_name ?? "",
      value,
      memberId,
      "update",
      "Lead"
    );
  }

  async createRecordFieldOption(fieldId: string, option_name: string) {
    return await prisma.fieldOption.create({
      data: {
        option_name: option_name,
        field_id: fieldId,
      },
    });
  }

  async createRecordDataFromCSV(
    excelData: Record<string, unknown>[],
    organizationId: string,
    moduleType: string
  ) {
    const fields = (await prisma.field.findMany({
      where: { organization_id: organizationId },
      include: { options: true },
    })) as (Field & { options: FieldOption[] })[];

    const fieldMap = new Map<string, Field & { options: FieldOption[] }>();

    for (const field of fields) {
      fieldMap.set(normalizeKey(field.field_name), field);
    }

    const recordsToCreate: {
      record_name: string;
      organization_id: string;
      module_type: string;
    }[] = [];

    const recordValueBuffer: {
      record_index: number;
      field_id: string;
      value: string;
    }[] = [];

    const optionsToCreate = new Map<string, Set<string>>();

    excelData.forEach((row, rowIndex) => {
      const recordName = resolveRecordName(row);

      recordsToCreate.push({
        record_name: recordName as string,
        organization_id: organizationId,
        module_type: moduleType,
      });

      for (const [csvFieldName, rawValue] of Object.entries(row)) {
        if (!rawValue || String(rawValue).trim() === "") continue;

        const field = fieldMap.get(normalizeKey(csvFieldName));
        if (!field) continue;

        let value = normalizeOptionValue(String(rawValue));

        if (!value) continue;

        if (isSelectType(field.field_type)) {
          const values =
            field.field_type === BoardFieldType.MULTISELECT
              ? value.split(",").map(normalizeOptionValue)
              : [normalizeOptionValue(value)];

          for (const v of values) {
            if (!v) continue;

            const exists = field.options.some(
              (opt) =>
                normalizeOptionValue(opt.option_name).toLowerCase() ===
                v.toLowerCase()
            );

            if (!exists) {
              if (!optionsToCreate.has(field.id)) {
                optionsToCreate.set(field.id, new Set());
              }
              optionsToCreate.get(field.id)!.add(v);
            }
          }

          value = values.join(",");
        }

        recordValueBuffer.push({
          record_index: rowIndex,
          field_id: field.id,
          value,
        });
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.board.createMany({
        data: recordsToCreate,
      });

      const createdRecords = await tx.board.findMany({
        where: { organization_id: organizationId },
        orderBy: { created_at: "desc" },
        take: recordsToCreate.length,
      });

      createdRecords.reverse();

      if (optionsToCreate.size > 0) {
        const optionRows: {
          option_name: string;
          field_id: string;
        }[] = [];

        for (const [fieldId, options] of optionsToCreate.entries()) {
          for (const opt of options) {
            optionRows.push({
              option_name: opt,
              field_id: fieldId,
            });
          }
        }

        await tx.fieldOption.createMany({
          data: optionRows,
          skipDuplicates: true,
        });
      }
      const recordValues = recordValueBuffer.map((lv) => ({
        record_id: createdRecords[lv.record_index].id,
        field_id: lv.field_id,
        value: lv.value,
      }));

      await tx.fieldValue.createMany({
        data: recordValues,
        skipDuplicates: true,
      });
    });
  }

  async createRecordHistory(
    recordId: string,
    oldValue: string,
    newValue: string,
    created_by: string,
    action?: string,
    column?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      await tx.history.create({
        data: {
          record_id: recordId,
          old_value: oldValue,
          new_value: newValue,
          action: action ?? "create",
          created_by: created_by,
          column: column,
        },
      });
      await tx.boardNotificationState.upsert({
        where: {
          record_id: recordId,
        },
        update: { last_seen: new Date() },
        create: { record_id: recordId, last_seen: new Date() },
      });
    });
  }

  async updateRecordHistory(recordId: string) {
    return await prisma.history.updateMany({
      where: { id: recordId },
      data: { created_at: new Date() },
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
        where: { board_county_id: countyId },
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
      data: { is_deleted: true },
    });
  }

  async deleteRecord(column_ids: string[], organizationId: string) {
    const record = await prisma.board.findMany({
      where: { id: { in: column_ids } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.board.updateMany({
        where: { id: { in: record.map((r) => r.id) } },
        data: { is_deleted: true },
      });
    });
    await purgeAllCacheKeys(`${CACHE_PREFIX.BOARDS}:${organizationId}:*`);
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
