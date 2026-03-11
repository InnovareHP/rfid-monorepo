import { LiaisonAnalytics } from "@dashboard/shared";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue, QueueEvents } from "bullmq";
import { appConfig } from "src/config/app-config";
import { analyticsPrompt } from "src/lib/gemini/prompt";
import { redis } from "src/lib/redis/redis";
import { prisma } from "../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";

@Injectable()
export class AnalyticsService {
  private readonly geminiQueueEvents: QueueEvents;

  constructor(
    @InjectQueue(QUEUE_NAMES.GEMINI)
    private readonly geminiQueue: Queue
  ) {
    this.geminiQueueEvents = new QueueEvents(QUEUE_NAMES.GEMINI, {
      connection: { url: appConfig.REDIS_URL },
    });
  }
  // 1️⃣ Top 10 Referring Facilities or Organizations
  async getTopFacilities(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const whereClause: Prisma.FieldValueWhereInput = {
      field: { fieldName: "Facility" },
      record: {
        organizationId: organizationId,
        moduleType: "REFERRAL",
        isDeleted: false,
        ...(startDate &&
          endDate && { createdAt: { gte: startDate, lte: endDate } }),
      },
    };

    return await prisma.fieldValue.groupBy({
      by: ["value"],
      where: whereClause,
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
      take: 10,
    });
  }

  async getTopClinicians(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const whereClause: Prisma.FieldValueWhereInput = {
      field: { fieldName: "Contact" },
      record: {
        moduleType: "REFERRAL",
        organizationId: organizationId,
        isDeleted: false,
        ...(startDate &&
          endDate && { createdAt: { gte: startDate, lte: endDate } }),
      },
    };
    return await prisma.fieldValue.groupBy({
      by: ["value"],
      where: whereClause,
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
      take: 10,
    });
  }

  async getTopCounties(organizationId: string, startDate: Date, endDate: Date) {
    const whereClause: Prisma.FieldValueWhereInput = {
      field: { fieldName: "County" },
      record: {
        moduleType: "REFERRAL",
        organizationId: organizationId,
        isDeleted: false,
        ...(startDate &&
          endDate && { createdAt: { gte: startDate, lte: endDate } }),
      },
    };
    return await prisma.fieldValue.groupBy({
      by: ["value"],
      where: whereClause,
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
    });
  }

  async getReferralSourceBreakdown(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const whereClause: Prisma.FieldValueWhereInput = {
      field: { fieldName: "Referral Source Type" },
      record: {
        moduleType: "REFERRAL",
        isDeleted: false,
        organizationId: organizationId,
        ...(startDate &&
          endDate && { createdAt: { gte: startDate, lte: endDate } }),
      },
    };
    return await prisma.fieldValue.groupBy({
      by: ["value"],
      where: whereClause,
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
    });
  }

  async getConversionRate(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const whereClause: Prisma.FieldValueWhereInput = {
      field: { fieldName: "Status" },
      value: "Admitted",
      record: {
        moduleType: "REFERRAL",
        isDeleted: false,
        organizationId: organizationId,
        ...(startDate &&
          endDate && { createdAt: { gte: startDate, lte: endDate } }),
      },
    };
    const totalReferrals = await prisma.board.count({
      where: whereClause.record,
    });
    const admitted = await prisma.fieldValue.count({
      where: whereClause,
    });

    return {
      totalReferrals,
      admitted,
      conversionRate: totalReferrals
        ? ((admitted / totalReferrals) * 100).toFixed(2)
        : 0,
    };
  }

  // 6️⃣ Average Time per Status (how long it took to reach each status)
  async getAverageTimeByStatus(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const dateFilter =
      startDate && endDate
        ? Prisma.sql`AND b."createdAt" >= ${startDate} AND b."createdAt" <= ${endDate}`
        : Prisma.empty;

    // Use History table: find when each referral's status was changed to each value
    // Calculate the time from referral creation to that status change
    const results = await prisma.$queryRaw<
      { status: string; avg_days: number; count: number }[]
    >`
      SELECT
        h."newValue" AS status,
        ROUND(AVG(EXTRACT(EPOCH FROM (h."createdAt" - b."createdAt")) / 86400)::numeric, 1) AS avg_days,
        COUNT(*)::int AS count
      FROM board_schema."History" h
      JOIN board_schema."Board" b ON b."id" = h."recordId"
      WHERE b."organizationId" = ${organizationId}
        AND b."moduleType" = 'REFERRAL'
        AND b."isDeleted" = false
        AND h."column" = 'Status'
        AND h."action" = 'update'
        AND h."newValue" IS NOT NULL
        AND h."newValue" != ''
        ${dateFilter}
      GROUP BY h."newValue"
      ORDER BY avg_days ASC;
    `;

    return results.map((r) => ({
      status: r.status,
      averageDays: String(r.avg_days),
      count: Number(r.count),
    }));
  }

  // Total counts for referrals and leads
  async getTotalCounts(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const dateFilter =
      startDate && endDate
        ? { createdAt: { gte: startDate, lte: endDate } }
        : {};

    const [totalReferrals, totalLeads, referralsThisPeriod, leadsThisPeriod] =
      await Promise.all([
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "REFERRAL",
            isDeleted: false,
          },
        }),
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "LEAD",
            isDeleted: false,
          },
        }),
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "REFERRAL",
            isDeleted: false,
            ...dateFilter,
          },
        }),
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "LEAD",
            isDeleted: false,
            ...dateFilter,
          },
        }),
      ]);

    return { totalReferrals, totalLeads, referralsThisPeriod, leadsThisPeriod };
  }

  // Status breakdown with colors
  async getStatusBreakdown(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const dateFilter =
      startDate && endDate
        ? { createdAt: { gte: startDate, lte: endDate } }
        : {};

    const statusCounts = await prisma.fieldValue.groupBy({
      by: ["value"],
      where: {
        field: { fieldName: "Status", moduleType: "REFERRAL" },
        record: {
          organizationId,
          moduleType: "REFERRAL",
          isDeleted: false,
          ...dateFilter,
        },
      },
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
    });

    // Fetch status field options for colors
    const statusField = await prisma.field.findFirst({
      where: {
        fieldName: "Status",
        moduleType: "REFERRAL",
        organizationId,
        isDeleted: false,
      },
      include: { options: { where: { isDeleted: false } } },
    });

    const colorMap = new Map(
      statusField?.options?.map((o) => [o.optionName, o.color]) ?? []
    );

    return statusCounts.map((s) => ({
      status: s.value ?? "Unknown",
      count: s._count.value,
      color: colorMap.get(s.value ?? "") ?? null,
    }));
  }

  // Admission type breakdown (Emergency, Routine, Transfer)
  async getAdmissionTypeBreakdown(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await prisma.fieldValue.groupBy({
      by: ["value"],
      where: {
        field: { fieldName: "Admission Type" },
        record: {
          organizationId,
          moduleType: "REFERRAL",
          isDeleted: false,
          ...(startDate &&
            endDate && { createdAt: { gte: startDate, lte: endDate } }),
        },
      },
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
    });
  }

  // 7️⃣ Payer Source Mix
  async getPayerMix(organizationId: string, startDate: Date, endDate: Date) {
    const whereClause: Prisma.FieldValueWhereInput = {
      field: { fieldName: "Payor" },
      record: {
        moduleType: "REFERRAL",
        isDeleted: false,
        organizationId: organizationId,
        ...(startDate &&
          endDate && { createdAt: { gte: startDate, lte: endDate } }),
      },
    };
    return await prisma.fieldValue.groupBy({
      by: ["value"],
      where: whereClause,
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
    });
  }

  // 9️⃣ Outreach Activity Impact — monthly referral trend
  async getOutreachImpact(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const results = await prisma.$queryRaw<{ month: string; total: number }[]>`
    SELECT TO_CHAR(r."createdAt", 'YYYY-MM') AS month, COUNT(*)::int AS total
    FROM board_schema."Board" r
    WHERE r."organizationId" = ${organizationId}
    AND r."moduleType" = 'REFERRAL'
    AND r."isDeleted" = false
    ${
      startDate && endDate
        ? Prisma.sql`AND r."createdAt" >= ${startDate} AND r."createdAt" <= ${endDate}`
        : Prisma.empty
    }
    GROUP BY month
    ORDER BY month ASC;
  `;
    return results;
  }

  // 🔟 Emerging Referral Sources (new/low frequency facilities)
  async getEmergingSources(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const results = await prisma.fieldValue.groupBy({
      by: ["value"],
      where: {
        field: { fieldName: "Facility" },
        record: {
          moduleType: "REFERRAL",
          organizationId: organizationId,
          isDeleted: false,
          ...(startDate &&
            endDate && { createdAt: { gte: startDate, lte: endDate } }),
        },
      },
      _count: {
        _all: true,
      },
      having: {
        value: {
          _count: {
            lt: 5,
          },
        },
      },
      orderBy: {
        _count: {
          value: "asc",
        },
      },
    });

    return results.map((r) => ({
      facility: r.value,
      recent_referrals: r._count?._all ?? 0,
    }));
  }

  // 🔹 Combine All Metrics
  async getAllAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const cachedData = await redis.get(
      `analytics:${organizationId}:${startDate}:${endDate}`
    );
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    const [
      totalCounts,
      statusBreakdown,
      avgTimeByStatus,
      admissionTypes,
      facilities,
      clinicians,
      counties,
      sources,
      conversion,
      payers,
      discharge,
      outreach,
    ] = await Promise.all([
      this.getTotalCounts(organizationId, startDate, endDate),
      this.getStatusBreakdown(organizationId, startDate, endDate),
      this.getAverageTimeByStatus(organizationId, startDate, endDate),
      this.getAdmissionTypeBreakdown(organizationId, startDate, endDate),
      this.getTopFacilities(organizationId, startDate, endDate),
      this.getTopClinicians(organizationId, startDate, endDate),
      this.getTopCounties(organizationId, startDate, endDate),
      this.getReferralSourceBreakdown(organizationId, startDate, endDate),
      this.getConversionRate(organizationId, startDate, endDate),
      this.getPayerMix(organizationId, startDate, endDate),
      this.getOutreachImpact(organizationId, startDate, endDate),
      this.getEmergingSources(organizationId, startDate, endDate),
    ]);

    const result = {
      totalCounts,
      statusBreakdown,
      avgTimeByStatus,
      admissionTypes,
      facilities,
      clinicians,
      counties,
      sources,
      conversion,
      payers,
      discharge,
      outreach,
    };

    redis.set(
      `analytics:${organizationId}:${startDate}:${endDate}`,
      JSON.stringify(result),
      "EX",
      60 * 5
    );

    return result;
  }

  async getAnalyticsByGemini(analytics: any) {
    const prompt = analyticsPrompt(analytics);
    const job = await this.geminiQueue.add("gemini", {
      type: "analytics-summary",
      prompt,
    });

    const result = await job.waitUntilFinished(this.geminiQueueEvents, 30000);
    return result;
  }

  async getAnalyticsMasterMarketingLeads(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string | null
  ) {
    const whereClause: Prisma.BoardWhereInput = {
      organizationId: organizationId,
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (userId) {
      whereClause.assignedTo = userId;
    }

    return prisma.board.findMany({
      where: whereClause,
      select: {
        id: true,
        assignedTo: true,
        createdAt: true,
        values: true,
      },
    });
  }

  async getMarketingLeadAnalytics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string | null
  ) {
    const cachedData = await redis.get(
      `marketing_analytics:${organizationId}:${startDate}:${endDate}:${userId}`
    );
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const boards = await this.getAnalyticsMasterMarketingLeads(
      organizationId,
      startDate,
      endDate,
      userId
    );

    const memberIds = [
      ...new Set(boards.map((board) => board.assignedTo).filter(Boolean)),
    ] as string[];

    let whereClause: Prisma.MarketingWhereInput = {
      isDeleted: false,
      member: {
        user: {
          id: { in: memberIds },
        },
      },
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (userId) {
      whereClause.member = {
        user: {
          id: userId,
        },
      };
    }

    const marketingLogs = await prisma.marketing.findMany({
      where: whereClause,
      select: {
        memberId: true,
        facility: true,
        touchpoints: true,
        talkedTo: true,
        member: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    type InternalAnalytics = LiaisonAnalytics & {
      _facilitySet: Set<string>;
      _peopleSet: Set<string>;
      _touchpointMap: Map<string, number>;
    };

    const analyticsMap = new Map<string, InternalAnalytics>();
    const marketingByMember = new Map<string, typeof marketingLogs>();

    for (const log of marketingLogs) {
      if (!marketingByMember.has(log.memberId)) {
        marketingByMember.set(log.memberId, []);
      }
      marketingByMember.get(log.memberId)!.push(log);
    }

    for (const log of marketingLogs) {
      if (!analyticsMap.has(log.memberId)) {
        analyticsMap.set(log.memberId, {
          memberId: log.memberId,
          memberName: log.member.user.name,
          totalLeads: 0,
          newLeads: 0,
          totalInteractions: 0,
          engagementLevel: "Low",

          facilitiesCovered: [],
          peopleContacted: [],
          touchpointsUsed: [],

          _facilitySet: new Set(),
          _peopleSet: new Set(),
          _touchpointMap: new Map(),
        });
      }
    }

    // 5. Apply lead-based metrics (SAFE)
    for (const board of boards) {
      if (!board.assignedTo) continue;

      const analytics = analyticsMap.get(board.assignedTo);
      if (!analytics) continue;

      analytics.totalLeads += 1;

      if (
        startDate &&
        endDate &&
        board.createdAt &&
        board.createdAt >= startDate &&
        board.createdAt <= endDate
      ) {
        analytics.newLeads += 1;
      }
    }

    for (const [memberId, logs] of marketingByMember.entries()) {
      const analytics = analyticsMap.get(memberId);
      if (!analytics) continue;

      analytics.totalInteractions += logs.length;

      for (const log of logs) {
        analytics._facilitySet.add(log.facility);

        analytics._peopleSet.add(log.talkedTo);

        if (Array.isArray(log.touchpoints)) {
          for (const tp of log.touchpoints) {
            analytics._touchpointMap.set(
              tp,
              (analytics._touchpointMap.get(tp) ?? 0) + 1
            );
          }
        }
      }

      analytics.engagementLevel =
        analytics.totalInteractions >= 6
          ? "High"
          : analytics.totalInteractions >= 3
            ? "Medium"
            : "Low";
    }

    for (const analytics of analyticsMap.values()) {
      analytics.facilitiesCovered = Array.from(analytics._facilitySet);
      analytics.peopleContacted = Array.from(analytics._peopleSet);

      analytics.touchpointsUsed = Array.from(
        analytics._touchpointMap.entries()
      ).map(([type, count]) => ({ type, count }));

      delete (analytics as any)._facilitySet;
      delete (analytics as any)._peopleSet;
      delete (analytics as any)._touchpointMap;
    }

    const analysis = await this.analyzeMarketingAnalytics(
      Array.from(analyticsMap.values())
    );

    const data = {
      analytics: Array.from(analyticsMap.values()),
      analysis,
    };

    redis.set(
      `marketing_analytics:${organizationId}:${startDate}:${endDate}:${userId}`,
      JSON.stringify(data),
      "EX",
      60 * 5
    );

    return data;
  }

  async analyzeMarketingAnalytics(analytics: any) {
    const prompt = `
    You are a marketing analytics expert.

    Analyze the following data and return ONLY valid JSON with this exact shape:

    {
      "keyInsights": string[],
      "strengths": string[],
      "weaknesses": string[],
      "actionableRecommendations": string[],
      "engagementOptimizations": string[]
    }

    Rules:
    - No markdown
    - No explanations
    - No extra keys
    - Arrays must contain concise bullet-style strings

    DATA:
    ${JSON.stringify(analytics, null, 2)}
    `;
    const job = await this.geminiQueue.add("gemini", {
      type: "marketing-analysis",
      prompt,
    });

    const result = await job.waitUntilFinished(this.geminiQueueEvents, 30000);
    return result;
  }
}
