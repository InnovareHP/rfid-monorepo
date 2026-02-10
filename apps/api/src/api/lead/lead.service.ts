// src/api/lead/lead.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { FieldType, LeadField, LeadFieldOption, Prisma } from "@prisma/client";
import { appConfig } from "src/config/app-config";
import {
  isSelectType,
  normalizeKey,
  normalizeOptionValue,
} from "src/lib/helper";
import { lookupByName } from "zipcodes-perogi";
import { prisma } from "../../lib/prisma/prisma";

@Injectable()
export class LeadService {
  async getAllLeads(organizationId: string, filters: any) {
    const {
      leadDateFrom,
      leadDateTo,
      page = 1,
      limit = 50,
      filter,
      search,
    } = filters;

    const offset = (page - 1) * Number(limit);

    const where: Prisma.LeadFlatViewWhereInput = {
      organization_id: organizationId,
    };

    if (leadDateFrom || leadDateTo) {
      where.created_at = {};

      if (leadDateFrom) {
        where.created_at.gte = new Date(leadDateFrom);
      }

      if (leadDateTo) {
        where.created_at.lte = new Date(leadDateTo);
      }
    }

    const ANDfilters: Prisma.LeadFlatViewWhereInput[] = [];

    if (ANDfilters.length > 0) {
      where.AND = ANDfilters;
    }

    if (search) {
      where.lead_name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (filter && Object.keys(filter).length > 0) {
      const dynamicFilters = Object.entries(filter)
        .filter(([key, val]) => key !== "" && val !== undefined)
        .map(([key, val]) => {
          return {
            lead_data: {
              path: [key], // column name
              string_contains: String(val),
            },
          };
        });

      if (!where.AND) where.AND = [];
      (where.AND as Prisma.LeadFlatViewWhereInput[]).push(...dynamicFilters);
    }

    const [leads, count, fields] = await Promise.all([
      prisma.leadFlatView.findMany({
        where,
        skip: offset,
        take: Number(limit),
        orderBy: [{ has_notification: "desc" }, { lead_name: "asc" }],
      }),
      prisma.leadFlatView.count({ where }),
      prisma.leadField.findMany({
        where: { organization_id: organizationId },
        orderBy: { field_order: "asc" },
      }),
    ]);

    const formatted = leads.map((r) => ({
      id: r.lead_id,
      lead_name: r.lead_name,
      assigned_to: r.assignedTo,
      has_notification: r.has_notification,
      created_at: r.created_at,
      ...(r.lead_data as Record<string, string | null>),
    }));

    return {
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
  }

  async getAllLeadHistory(organizationId: string, filters: any) {
    const { page = 1, limit = 50 } = filters;
    const offset = (page - 1) * Number(limit);
    const where: Prisma.LeadHistoryFindManyArgs = {
      where: {
        lead: {
          organization_id: organizationId,
        },
        action: { in: ["delete", "update", "restore"] },
      },
    };
    const [history, total] = await Promise.all([
      prisma.leadHistory.findMany({
        where: where.where,
        orderBy: { created_at: "desc" },
        take: Number(limit),
        skip: offset,
        include: {
          user: {
            select: {
              user_name: true,
            },
          },
          lead: {
            select: {
              lead_name: true,
            },
          },
        },
      }),
      prisma.leadHistory.count({ where: where.where }),
    ]);
    const formatted = history.map((h) => {
      return {
        id: h.id,
        created_at: h.created_at,
        created_by: h.user?.user_name,
        action: h.action,
        lead_name: h.lead?.lead_name,
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
  async getLeadHistory(leadId: string, take: number, offset: number) {
    const [history, total] = await Promise.all([
      prisma.leadHistory.findMany({
        where: { lead_id: leadId },
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
      prisma.leadHistory.count({
        where: { lead_id: leadId },
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

  async getLeadAnalyze(
    leadId: string,
    dateStartDate?: Date,
    dateEndDate?: Date
  ) {
    /**
     * 1. Get lead + assigned marketing member
     */
    const lead = await prisma.lead.findFirstOrThrow({
      where: { id: leadId },
      select: {
        lead_name: true,
        assignedTo: true, // marketing member id
        user: {
          select: {
            id: true,
            user_name: true,
          },
        },
      },
    });

    if (!lead.assignedTo) {
      return {
        leadId,
        leadName: lead.lead_name,
        assignedTo: null,
        summary: null,
        message: "Lead is not yet assigned to a marketing member.",
      };
    }

    /**
     * 3. Build marketing filter
     */
    const where: Prisma.marketingWhereInput = {
      member: {
        user_table: {
          id: lead.user?.id,
        },
      },
    } as Prisma.marketingWhereInput;

    if (lead.lead_name) {
      where.facility = {
        contains: lead.lead_name,
        mode: "insensitive",
      };
    }
    /**
     * 5. Fetch marketing logs
     */
    const marketingLogs = await prisma.marketing.findMany({
      where,
      select: {
        facility: true,
        touchpoints: true,
        talkedTo: true,
        notes: true,
      },
    });

    /**
     * 6. Basic metrics
     */
    const totalInteractions = marketingLogs.length;

    const facilitiesCovered = [
      ...new Set(
        marketingLogs
          .map((m) => m.facility)
          .filter((f): f is string => Boolean(f))
      ),
    ];

    /**
     * 7. Touchpoint aggregation
     */
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

    /**
     * 8. People contacted
     */
    const peopleContacted = [
      ...new Set(
        marketingLogs
          .map((m) => m.talkedTo)
          .filter((p): p is string => Boolean(p))
      ),
    ];

    /**
     * 9. Engagement level
     */
    const engagementLevel =
      totalInteractions >= 6
        ? "High"
        : totalInteractions >= 3
          ? "Medium"
          : "Low";

    /**
     * 10. Narrative (safe + readable)
     */
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

    /**
     * 11. Final response
     */
    return {
      leadId,
      leadName: lead.lead_name,
      assignedTo: lead.user?.user_name ?? "Unknown",
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

  async getLeadById(leadId: string, organizationId: string) {
    const leads = await prisma.leadFlatView.findFirstOrThrow({
      where: { lead_id: leadId },
      select: {
        lead_name: true,
        assignedTo: true,
        lead_data: true,
      },
    });

    const formatted = {
      organization: leads.lead_name,
      account_manager: leads.assignedTo,
      ...(leads.lead_data as Record<string, string | null>),
    };

    const fields = await prisma.leadField.findMany({
      orderBy: { field_order: "asc" },
      where: { organization_id: organizationId },
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

  async getLeadFieldOptions(
    fieldId: string,
    organizationId: string,
    page: number,
    limit: number
  ) {
    if (fieldId === FieldType.ASSIGNED_TO) {
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

    let where: Prisma.LeadFieldOptionFindManyArgs = {
      where: { lead_field_id: fieldId, is_deleted: false },
    };

    if (page && limit) {
      where.skip = (page - 1) * limit;
      where.take = Number(limit);
      where.orderBy = { option_name: "asc" };
    }

    const options = await prisma.leadFieldOption.findMany(where);

    if (!page && !limit) {
      return options.map((o) => ({
        id: o.id,
        value: o.option_name,
      }));
    }

    const field = await prisma.leadField.findUnique({
      where: { id: fieldId },
      select: {
        field_name: true,
      },
    });

    const total = await prisma.leadFieldOption.count({
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

  async updateLeadValue(
    lead_id: string,
    fieldId: string,
    value: string,
    organizationId: string,
    memberId: string
  ) {
    try {
      if (fieldId === FieldType.ASSIGNED_TO) {
        return await this.updateAssignedTo(lead_id, value, memberId);
      }

      if (fieldId === "Lead") {
        return await this.updateLeadName(lead_id, value, memberId);
      }

      const field = await prisma.leadField.findUnique({
        where: { id: fieldId, organization_id: organizationId },
        select: {
          field_type: true,
          id: true,
          field_name: true,
        },
      });

      if (!field) throw new NotFoundException("Field not found");

      if (field.field_type === FieldType.LOCATION) {
        return await this.createLocation(value, lead_id, organizationId);
      }

      // Get the old value before updating
      const existingLeadValue = await prisma.leadValue.findUnique({
        where: {
          lead_id_field_id: { lead_id: lead_id, field_id: field.id },
        },
        select: { value: true },
      });

      const leadValue = await prisma.leadValue.upsert({
        where: {
          lead_id_field_id: { lead_id: lead_id, field_id: field.id },
        },
        update: { value },
        create: { lead_id: lead_id, field_id: field.id, value },
      });

      await this.createLeadHistory(
        lead_id,
        existingLeadValue?.value ?? "",
        value,
        memberId,
        "update",
        field.field_name
      );

      return leadValue;
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  async createLead(
    lead_name: string,
    organizationId: string,
    memberId: string
  ) {
    const lead = await prisma.lead.create({
      data: { lead_name: lead_name ?? "", organization_id: organizationId },
    });

    const fields = await prisma.leadField.findMany();
    await prisma.leadValue.createMany({
      data: fields.map((f) => ({
        lead_id: lead.id,
        field_id: f.id,
        value: null,
      })),
    });

    await this.createLeadHistory(lead.id, "", lead_name, memberId, "create");

    return lead;
  }

  async restoreLead(
    lead_id: string,
    history_id: string,
    organizationId: string,
    event_type: string,
    userId: string
  ) {
    const history = await prisma.leadHistory.findUniqueOrThrow({
      where: { id: history_id },
      select: { column: true, old_value: true, new_value: true, lead_id: true },
    });

    if (event_type === "update") {
      const lead = await prisma.lead.findUniqueOrThrow({
        where: { id: history.lead_id },
        select: { is_deleted: true },
      });

      if (lead.is_deleted) {
        throw new NotFoundException("Lead not found");
      }

      const field = await prisma.leadField.findFirstOrThrow({
        where: {
          field_name: history.column ?? "",
          organization_id: organizationId,
        },
      });

      await prisma.$transaction(async (tx) => {
        await tx.leadValue.update({
          where: {
            lead_id_field_id: {
              lead_id: history.lead_id,
              field_id: field.id,
            },
          },
          data: { value: history.old_value },
        });
        await tx.leadHistory.create({
          data: {
            lead_id: history.lead_id,
            old_value: history.new_value,
            new_value: history.old_value,
            action: "restore",
            column: history.column,
            created_by: userId,
          },
        });
      });
      return {
        message: "Lead restored successfully",
      };
    }

    if (event_type === "delete") {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: history.lead_id },
          data: { is_deleted: Boolean(history.old_value) },
        });
        await tx.leadHistory.create({
          data: {
            lead_id: history.lead_id,
            old_value: history.new_value,
            new_value: history.old_value,
            action: "restore",
            column: history.column,
            created_by: userId,
          },
        });
      });
      return {
        message: "Lead deleted successfully",
      };
    }
  }

  async setLeadNotificationState(lead_id: string) {
    const deleted = await prisma.leadNotificationState.deleteMany({
      where: { lead_id: lead_id },
    });

    return {
      message: "Notification marked as seen",
      deleted: deleted.count,
    };
  }

  async createColumn(
    column_name: string,
    lead_type: FieldType,
    organizationId: string
  ) {
    const lastColumn = await prisma.leadField.findFirst({
      where: { organization_id: organizationId },
      orderBy: { field_order: "desc" },
    });

    const newOrder = lastColumn ? lastColumn.field_order + 1 : 1;

    return await prisma.leadField.create({
      data: {
        field_name: column_name,
        field_type: lead_type,
        field_order: newOrder,
        organization_id: organizationId,
      },
    });
  }

  async createLocation(
    location_name: string,
    lead_id: string,
    organizationId: string
  ) {
    // ----- A. CACHE CHECK -----

    if (location_name === "") {
      const fields = await prisma.leadField.findMany({
        where: {
          field_name: {
            in: ["Address", "City", "State", "Zip Code", "County", "Country"],
          },
          organization_id: organizationId,
        },
        select: { id: true, field_name: true },
      });
      await prisma.leadValue.updateMany({
        where: { lead_id: lead_id, field_id: { in: fields.map((f) => f.id) } },
        data: { value: null },
      });

      return {
        address: null,
        isCached: true,
      };
    }

    const existing = await prisma.leadValue.findFirst({
      where: { lead_id },
      select: { value: true },
    });

    if (existing?.value === location_name) {
      return {
        address: location_name,
        isCached: true,
      };
    }

    // ----- B. GEOCODIFY REQUEST -----
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
      city: props.locality ?? null, // ✅ City
      state: props.region_a ?? props.region ?? null, // ✅ State
      zip: lookupByName(props.locality, props.region_a)[0].zip,
      county: props.county.replace(/ County/g, "") ?? null, // ✅ County
      country: props.country ?? null, // ✅ Country
    };

    // ----- D. FETCH LEAD FIELDS -----
    const fields = await prisma.leadField.findMany({
      where: {
        field_name: {
          in: ["Address", "City", "State", "Zip Code", "County", "Country"],
        },
        organization_id: organizationId,
      },
      select: { id: true, field_name: true },
    });

    // ----- E. PREPARE UPSERTS -----
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
        const key = field.field_name.toLowerCase().replace(/\s+/g, ""); // "Zip Code" → "zipcode"

        const value = mapper[key];
        if (!value) return null;

        return prisma.leadValue.upsert({
          where: {
            lead_id_field_id: {
              lead_id,
              field_id: field.id,
            },
          },
          update: { value },
          create: {
            lead_id,
            field_id: field.id,
            value,
          },
        });
      })
      .filter(Boolean);

    // ----- F. EXECUTE -----
    await Promise.all(upserts);

    return locationData;
  }

  async updateAssignedTo(lead_id: string, value: string, memberId: string) {
    // Get the old assigned user before updating
    const existingLead = await prisma.lead.findUnique({
      where: { id: lead_id },
      select: {
        assignedTo: true,
        user: {
          select: {
            user_name: true,
          },
        },
      },
    });

    await prisma.lead.update({
      where: { id: lead_id },
      data: { assignedTo: value },
    });

    const newAssignedUser = await prisma.user_table.findUniqueOrThrow({
      where: {
        id: value,
      },
      select: {
        user_name: true,
      },
    });

    await this.createLeadHistory(
      lead_id,
      existingLead?.user?.user_name ?? "",
      newAssignedUser.user_name ?? "",
      memberId,
      "update",
      "Assigned To"
    );
  }

  async updateLeadName(lead_id: string, value: string, memberId: string) {
    // Get the old lead name before updating
    const existingLead = await prisma.lead.findUnique({
      where: { id: lead_id },
      select: { lead_name: true },
    });

    await prisma.lead.update({
      where: { id: lead_id },
      data: { lead_name: value },
    });
    await this.createLeadHistory(
      lead_id,
      existingLead?.lead_name ?? "",
      value,
      memberId,
      "update",
      "Lead"
    );
  }

  async createLeadFieldOption(fieldId: string, option_name: string) {
    return await prisma.leadFieldOption.create({
      data: {
        option_name: option_name,
        lead_field_id: fieldId,
      },
    });
  }

  async createLeadDataFromCSV(
    excelData: Record<string, any>[],
    organizationId: string
  ) {
    const fields = (await prisma.leadField.findMany({
      where: { organization_id: organizationId },
      include: { LeadFieldOption: true },
    })) as (LeadField & { LeadFieldOption: LeadFieldOption[] })[];

    /* ---------------------------------- */
    /* 1. Field map (normalized)           */
    /* ---------------------------------- */

    const fieldMap = new Map<
      string,
      LeadField & { LeadFieldOption: LeadFieldOption[] }
    >();

    for (const field of fields) {
      fieldMap.set(normalizeKey(field.field_name), field);
    }

    /* ---------------------------------- */
    /* 2. Buffers                          */
    /* ---------------------------------- */

    const leadsToCreate: {
      lead_name: string;
      organization_id: string;
    }[] = [];

    const leadValueBuffer: {
      lead_index: number;
      field_id: string;
      value: string;
    }[] = [];

    const optionsToCreate = new Map<string, Set<string>>();

    /* ---------------------------------- */
    /* 3. Parse CSV rows                  */
    /* ---------------------------------- */

    excelData.forEach((row, rowIndex) => {
      const leadName = resolveLeadName(row);

      leadsToCreate.push({
        lead_name: leadName,
        organization_id: organizationId,
      });

      for (const [csvFieldName, rawValue] of Object.entries(row)) {
        if (!rawValue || String(rawValue).trim() === "") continue;

        const field = fieldMap.get(normalizeKey(csvFieldName));
        if (!field) continue;

        // 🔥 NORMALIZE RAW VALUE
        let value = normalizeOptionValue(String(rawValue));

        if (!value) continue;

        /* ------------------------------- */
        /* SELECT / MULTISELECT FIX        */
        /* ------------------------------- */

        if (isSelectType(field.field_type)) {
          const values =
            field.field_type === FieldType.MULTISELECT
              ? value.split(",").map(normalizeOptionValue)
              : [normalizeOptionValue(value)];

          for (const v of values) {
            if (!v) continue;

            const exists = field.LeadFieldOption.some(
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

        leadValueBuffer.push({
          lead_index: rowIndex,
          field_id: field.id,
          value,
        });
      }
    });

    /* ---------------------------------- */
    /* 4. Batched DB transaction           */
    /* ---------------------------------- */

    await prisma.$transaction(async (tx) => {
      /* 4.1 Create leads */
      await tx.lead.createMany({
        data: leadsToCreate,
      });

      const createdLeads = await tx.lead.findMany({
        where: { organization_id: organizationId },
        orderBy: { created_at: "desc" },
        take: leadsToCreate.length,
      });

      createdLeads.reverse();

      /* 4.2 Create new options (SAFE) */
      if (optionsToCreate.size > 0) {
        const optionRows: {
          option_name: string;
          lead_field_id: string;
        }[] = [];

        for (const [fieldId, options] of optionsToCreate.entries()) {
          for (const opt of options) {
            optionRows.push({
              option_name: opt,
              lead_field_id: fieldId,
            });
          }
        }

        await tx.leadFieldOption.createMany({
          data: optionRows,
          skipDuplicates: true,
        });
      }

      /* 4.3 Create lead values */
      const leadValues = leadValueBuffer.map((lv) => ({
        lead_id: createdLeads[lv.lead_index].id,
        field_id: lv.field_id,
        value: lv.value,
      }));

      await tx.leadValue.createMany({
        data: leadValues,
        skipDuplicates: true,
      });
    });
  }

  async createLeadHistory(
    leadId: string,
    oldValue: string,
    newValue: string,
    created_by: string,
    action?: string,
    column?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      await tx.leadHistory.create({
        data: {
          lead_id: leadId,
          old_value: oldValue,
          new_value: newValue,
          action: action ?? "create",
          created_by: created_by,
          column: column,
        },
      });
      await tx.leadNotificationState.upsert({
        where: {
          lead_id: leadId,
        },
        update: {
          last_seen: new Date(),
        },
        create: {
          lead_id: leadId,
          last_seen: new Date(),
        },
      });
    });
  }

  async updateLeadHistory(leadId: string) {
    return await prisma.leadHistory.updateMany({
      where: { id: leadId },
      data: { created_at: new Date() },
    });
  }

  async deleteLeadHistory(timelineId: string) {
    const timeline = await prisma.leadHistory.findUnique({
      where: { id: timelineId },
    });
    if (!timeline) throw new NotFoundException("Timeline not found");

    return await prisma.leadHistory.delete({ where: { id: timelineId } });
  }

  async deleteLeadFieldOption(optionId: string) {
    return await prisma.leadFieldOption.update({
      where: { id: optionId },
      data: { is_deleted: true },
    });
  }

  async deleteLead(column_ids: string[]) {
    const lead = await prisma.lead.findMany({
      where: { id: { in: column_ids } },
    });

    await prisma.$transaction(async (tx) => {
      // await tx.leadValue.deleteMany({
      //   where: { lead_id: { in: column_ids } },
      // });

      // await tx.leadHistory.deleteMany({
      //   where: { lead_id: { in: lead.map((l) => l.id) } },
      // });

      await tx.lead.updateMany({
        where: { id: { in: lead.map((l) => l.id) } },
        data: { is_deleted: true },
      });
    });
  }
}

function resolveLeadName(row: Record<string, any>) {
  return (
    row["Name of Organization"] ||
    row["Company Name"] ||
    row["Organization"] ||
    row["Org Name"] ||
    "Untitled Lead"
  );
}
