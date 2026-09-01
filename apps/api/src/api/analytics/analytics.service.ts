import { LiaisonAnalytics, ROLES } from "@dashboard/shared";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue, QueueEvents } from "bullmq";
import { appConfig } from "src/config/app-config";
import { analyticsPrompt } from "src/lib/aws/prompts";
import { cacheData, getData } from "src/lib/redis/redis";
import { prisma } from "../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";

// FieldValue.value, Board.recordName and History values are encrypted at
// rest, so every aggregation groups in memory after decryption instead of
// GROUP BY / raw SQL in Postgres.

// Interpolating a Date directly renders it in the server's locale and zone, so
// the same range would key differently across hosts or after a TZ change. ISO
// keeps the key stable and comparable.
const keyPart = (value: Date | undefined) => value?.toISOString() ?? "none";

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

  private referralRecordWhere(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    assignedTo?: string | null
  ): Prisma.BoardWhereInput {
    return {
      moduleType: "REFERRAL",
      organizationId,
      isDeleted: false,
      ...(assignedTo && { assignedTo }),
      ...(startDate &&
        endDate && { createdAt: { gte: startDate, lte: endDate } }),
    };
  }

  private countByValue(
    rows: { value: string | null }[],
    take?: number
  ): { value: string | null; _count: { value: number } }[] {
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.value ?? "", (counts.get(r.value ?? "") ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({
        value: value === "" ? null : value,
        _count: { value: count },
      }));
    return take ? sorted.slice(0, take) : sorted;
  }

  private async fetchReferralLinkedLeads(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string | null
  ) {
    return prisma.boardRelation.findMany({
      where: {
        relationType: "REFERRAL_LINK",
        source: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
        target: { moduleType: "LEAD", isDeleted: false },
      },
      select: {
        target: { select: { id: true, recordName: true } },
      },
    });
  }

  async getTopFacilities(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const links = await this.fetchReferralLinkedLeads(
      organizationId,
      startDate,
      endDate,
      userId
    );
    return this.countByValue(
      links.map((l) => ({ value: l.target?.recordName ?? null })),
      10
    ).filter((r) => r.value !== null);
  }

  async getTopClinicians(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const rows = await prisma.fieldValue.findMany({
      where: {
        field: { fieldName: "Contact" },
        record: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
      },
      select: { value: true },
    });
    return this.countByValue(rows, 10);
  }

  async getTopCounties(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const links = await prisma.boardRelation.findMany({
      where: {
        relationType: "REFERRAL_LINK",
        source: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
        target: { moduleType: "LEAD", isDeleted: false },
      },
      select: {
        target: {
          select: {
            values: {
              where: {
                field: {
                  fieldName: "County",
                  moduleType: "LEAD",
                  isDeleted: false,
                },
              },
              select: { value: true },
            },
          },
        },
      },
    });

    const counties = links.flatMap((l) => l.target?.values ?? []);
    return this.countByValue(counties).filter((r) => r.value !== null);
  }

  async getReferralSourceBreakdown(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const rows = await prisma.fieldValue.findMany({
      where: {
        field: { fieldName: "Referral Source Type" },
        record: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
      },
      select: { value: true },
    });
    return this.countByValue(rows);
  }

  async getConversionRate(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const recordWhere = this.referralRecordWhere(
      organizationId,
      startDate,
      endDate,
      userId
    );
    const [totalReferrals, statusRows] = await Promise.all([
      prisma.board.count({ where: recordWhere }),
      prisma.fieldValue.findMany({
        where: {
          field: { fieldName: "Status" },
          record: recordWhere,
        },
        select: { value: true, record: { select: { createdAt: true } } },
      }),
    ]);
    const admitted = statusRows.filter((r) => r.value === "Admitted").length;

    // Month buckets keyed on the referral creation date, not the status change.
    const monthly = new Map<string, { total: number; admitted: number }>();
    for (const row of statusRows) {
      const month = row.record.createdAt.toISOString().slice(0, 7);
      const entry = monthly.get(month) ?? { total: 0, admitted: 0 };
      entry.total += 1;
      if (row.value === "Admitted") entry.admitted += 1;
      monthly.set(month, entry);
    }
    const months = [...monthly.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );

    return {
      totalReferrals,
      admitted,
      conversionRate: totalReferrals
        ? Number(((admitted / totalReferrals) * 100).toFixed(2))
        : 0,
      monthlyAdmitted: months.map(([month, m]) => ({
        month,
        total: m.admitted,
      })),
      monthlyRate: months.map(([month, m]) => ({
        month,
        total: m.total ? Number(((m.admitted / m.total) * 100).toFixed(2)) : 0,
      })),
    };
  }

  // Weighted average days to a status change, bucketed by month.
  async getAvgTimeTrend(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const rows = await prisma.history.findMany({
      where: {
        column: "Status",
        action: "update",
        record: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
      },
      select: {
        createdAt: true,
        record: { select: { createdAt: true } },
      },
    });

    const monthly = new Map<string, { totalDays: number; count: number }>();
    for (const row of rows) {
      const month = row.createdAt.toISOString().slice(0, 7);
      const days =
        (row.createdAt.getTime() - row.record.createdAt.getTime()) / 86400000;
      const entry = monthly.get(month) ?? { totalDays: 0, count: 0 };
      entry.totalDays += days;
      entry.count += 1;
      monthly.set(month, entry);
    }

    return [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, m]) => ({
        month,
        total: Number((m.totalDays / m.count).toFixed(1)),
      }));
  }

  // 6️⃣ Average Time per Status (how long it took to reach each status)
  async getAverageTimeByStatus(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    // Time from referral creation to each status change, from History
    const rows = await prisma.history.findMany({
      where: {
        column: "Status",
        action: "update",
        record: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
      },
      select: {
        newValue: true,
        createdAt: true,
        record: { select: { createdAt: true } },
      },
    });

    const agg = new Map<string, { totalDays: number; count: number }>();
    for (const r of rows) {
      if (!r.newValue) continue;
      const days =
        (r.createdAt.getTime() - r.record.createdAt.getTime()) / 86400000;
      const entry = agg.get(r.newValue) ?? { totalDays: 0, count: 0 };
      entry.totalDays += days;
      entry.count += 1;
      agg.set(r.newValue, entry);
    }

    return [...agg.entries()]
      .map(([status, a]) => ({
        status,
        averageDays: (a.totalDays / a.count).toFixed(1),
        count: a.count,
      }))
      .sort((a, b) => Number(a.averageDays) - Number(b.averageDays));
  }

  // Referral and admission counts per liaison, keyed on Board.assignedTo.
  // Status is decrypted by the client extension, so admitted is matched here.
  async getReferralCountsByLiaison(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string | null
  ) {
    const records = await prisma.board.findMany({
      where: this.referralRecordWhere(
        organizationId,
        startDate,
        endDate,
        userId
      ),
      select: {
        assignedTo: true,
        values: {
          where: { field: { fieldName: "Status", moduleType: "REFERRAL" } },
          select: { value: true },
        },
      },
    });

    const byUser = new Map<string, { referrals: number; admissions: number }>();
    let referrals = 0;
    let admissions = 0;

    for (const record of records) {
      const admitted = record.values.some((v) => v.value === "Admitted");
      referrals += 1;
      if (admitted) admissions += 1;

      if (!record.assignedTo) continue;

      const entry = byUser.get(record.assignedTo) ?? {
        referrals: 0,
        admissions: 0,
      };
      entry.referrals += 1;
      if (admitted) entry.admissions += 1;
      byUser.set(record.assignedTo, entry);
    }

    return { byUser, totals: { referrals, admissions } };
  }

  // Total counts for referrals and leads
  async getTotalCounts(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const dateFilter =
      startDate && endDate
        ? { createdAt: { gte: startDate, lte: endDate } }
        : {};

    const assigned = userId ? { assignedTo: userId } : {};

    const [totalReferrals, totalLeads, referralsThisPeriod, leadsThisPeriod] =
      await Promise.all([
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "REFERRAL",
            isDeleted: false,
            ...assigned,
          },
        }),
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "LEAD",
            isDeleted: false,
            ...assigned,
          },
        }),
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "REFERRAL",
            isDeleted: false,
            ...assigned,
            ...dateFilter,
          },
        }),
        prisma.board.count({
          where: {
            organizationId,
            moduleType: "LEAD",
            isDeleted: false,
            ...assigned,
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
    endDate: Date,
    userId?: string | null
  ) {
    const dateFilter =
      startDate && endDate
        ? { createdAt: { gte: startDate, lte: endDate } }
        : {};

    const statusRows = await prisma.fieldValue.findMany({
      where: {
        field: { fieldName: "Status", moduleType: "REFERRAL" },
        record: {
          organizationId,
          moduleType: "REFERRAL",
          isDeleted: false,
          ...(userId && { assignedTo: userId }),
          ...dateFilter,
        },
      },
      select: { value: true },
    });
    const statusCounts = this.countByValue(statusRows);

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
    endDate: Date,
    userId?: string | null
  ) {
    const rows = await prisma.fieldValue.findMany({
      where: {
        field: { fieldName: "Admission Type" },
        record: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
      },
      select: { value: true },
    });
    return this.countByValue(rows);
  }

  // 7️⃣ Payer Source Mix
  async getPayerMix(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const rows = await prisma.fieldValue.findMany({
      where: {
        field: { fieldName: "Payor" },
        record: this.referralRecordWhere(
          organizationId,
          startDate,
          endDate,
          userId
        ),
      },
      select: { value: true },
    });
    return this.countByValue(rows);
  }

  // 9️⃣ Outreach Activity Impact — monthly referral trend
  async getOutreachImpact(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const results = await prisma.$queryRaw<{ month: string; total: number }[]>`
    SELECT TO_CHAR(r."createdAt", 'YYYY-MM') AS month, COUNT(*)::int AS total
    FROM board_schema."Board" r
    WHERE r."organizationId" = ${organizationId}
    AND r."moduleType" = 'REFERRAL'
    AND r."isDeleted" = false
    ${userId ? Prisma.sql`AND r."assignedTo" = ${userId}` : Prisma.empty}
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

  async getEmergingSources(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const links = await this.fetchReferralLinkedLeads(
      organizationId,
      startDate,
      endDate,
      userId
    );

    const counts = new Map<string, number>();
    for (const l of links) {
      const name = l.target?.recordName;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return [...counts.entries()]
      .filter(([, count]) => count < 5)
      .sort((a, b) => a[1] - b[1])
      .map(([facility, count]) => ({
        facility,
        recent_referrals: count,
      }));
  }

  async getReferralSourceScorecard(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const links = await this.fetchReferralLinkedLeads(
      organizationId,
      startDate,
      endDate,
      userId
    );

    const byLead = new Map<string, { name: string; count: number }>();
    for (const l of links) {
      if (!l.target) continue;
      const entry = byLead.get(l.target.id) ?? {
        name: l.target.recordName,
        count: 0,
      };
      entry.count += 1;
      byLead.set(l.target.id, entry);
    }

    const results = [...byLead.values()].sort((a, b) => b.count - a.count);

    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const weeks =
      startDate && endDate
        ? Math.max(1, (endDate.getTime() - startDate.getTime()) / msInWeek)
        : 4;

    return results.map((r) => {
      const rate = r.count / weeks;
      let tier: "Tier 1" | "Tier 2" | "Infrequent";
      if (rate > 1) tier = "Tier 1";
      else if (rate >= 0.25) tier = "Tier 2";
      else tier = "Infrequent";

      return {
        sourceName: r.name,
        referralCount: r.count,
        tier,
        referralsPerWeek: Number(rate.toFixed(2)),
      };
    });
  }

  async getDenialTracking(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    const boards = await prisma.board.findMany({
      where: this.referralRecordWhere(
        organizationId,
        startDate,
        endDate,
        userId
      ),
      select: {
        createdAt: true,
        values: {
          where: {
            field: {
              moduleType: "REFERRAL",
              isDeleted: false,
              fieldName: { in: ["Status", "Reason"] },
            },
          },
          select: {
            value: true,
            field: { select: { fieldName: true } },
          },
        },
      },
    });

    const denied = boards.filter((b) =>
      b.values.some(
        (v) =>
          v.field.fieldName === "Status" &&
          (v.value === "Rejected" || v.value === "Denied")
      )
    );

    const reasonCounts = new Map<string, number>();
    const monthly = new Map<string, number>();
    for (const b of denied) {
      const month = b.createdAt.toISOString().slice(0, 7);
      monthly.set(month, (monthly.get(month) ?? 0) + 1);
      for (const v of b.values) {
        if (v.field.fieldName === "Reason" && v.value) {
          reasonCounts.set(v.value, (reasonCounts.get(v.value) ?? 0) + 1);
        }
      }
    }

    const reasons = [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count }));

    const totalDenials = reasons.reduce((sum, r) => sum + r.count, 0);

    return {
      reasons,
      monthlyTrend: [...monthly.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, total]) => ({ month, total })),
      totalDenials,
    };
  }

  // 🔹 Combine All Metrics
  async getAllAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string | null
  ) {
    // Every metric below is a separate scan over the referral board, so the
    // assembled payload is served from Redis for five minutes rather than
    // recomputed on each visit.
    const cacheKey = `analytics:${organizationId}:${keyPart(startDate)}:${keyPart(endDate)}:${userId ?? "all"}`;
    const cached = await getData(cacheKey);
    if (cached) return cached;

    const [
      totalCounts,
      statusBreakdown,
      avgTimeByStatus,
      avgTimeTrend,
      admissionTypes,
      facilities,
      clinicians,
      counties,
      sources,
      conversion,
      payers,
      discharge,
      outreach,
      scorecard,
      denials,
    ] = await Promise.all([
      this.getTotalCounts(organizationId, startDate, endDate, userId),
      this.getStatusBreakdown(organizationId, startDate, endDate, userId),
      this.getAverageTimeByStatus(organizationId, startDate, endDate, userId),
      this.getAvgTimeTrend(organizationId, startDate, endDate, userId),
      this.getAdmissionTypeBreakdown(
        organizationId,
        startDate,
        endDate,
        userId
      ),
      this.getTopFacilities(organizationId, startDate, endDate, userId),
      this.getTopClinicians(organizationId, startDate, endDate, userId),
      this.getTopCounties(organizationId, startDate, endDate, userId),
      this.getReferralSourceBreakdown(
        organizationId,
        startDate,
        endDate,
        userId
      ),
      this.getConversionRate(organizationId, startDate, endDate, userId),
      this.getPayerMix(organizationId, startDate, endDate, userId),
      this.getOutreachImpact(organizationId, startDate, endDate, userId),
      this.getEmergingSources(organizationId, startDate, endDate, userId),
      this.getReferralSourceScorecard(
        organizationId,
        startDate,
        endDate,
        userId
      ),
      this.getDenialTracking(organizationId, startDate, endDate, userId),
    ]);

    const result = {
      totalCounts,
      statusBreakdown,
      avgTimeByStatus,
      avgTimeTrend,
      admissionTypes,
      facilities,
      clinicians,
      counties,
      sources,
      conversion,
      payers,
      discharge,
      outreach,
      scorecard,
      denials,
    };

    await cacheData(cacheKey, result, 60 * 5);

    return result;
  }

  async getAnalyticsByGemini(
    organizationId: string,
    startDate: Date | undefined,
    endDate: Date | undefined,
    analytics: any,
    force = false,
    userId?: string | null
  ) {
    // The summary describes the caller's own slice, so a liaison's cannot be
    // served from the org-wide key.
    const cacheKey = `analytics_summary:${organizationId}:${keyPart(startDate)}:${keyPart(endDate)}:${userId ?? "all"}`;
    if (!force) {
      const cached = await getData(cacheKey);
      if (cached) return cached;
    }

    const prompt = analyticsPrompt(analytics);
    const job = await this.geminiQueue.add("gemini", {
      type: "analytics-summary",
      prompt,
      organizationId,
    });

    const result = await job.waitUntilFinished(this.geminiQueueEvents, 30000);
    await cacheData(cacheKey, result, 60 * 5);
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
      moduleType: "LEAD",
      isDeleted: false,
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
      },
    });
  }

  async getMarketingLeadAnalytics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string | null
  ) {
    const cachedData = await getData(
      `marketing_analytics:${organizationId}:${keyPart(startDate)}:${keyPart(endDate)}:${userId}`
    );
    if (cachedData) {
      return cachedData;
    }

    const boards = await this.getAnalyticsMasterMarketingLeads(
      organizationId,
      startDate,
      endDate,
      userId
    );

    const whereClause: Prisma.MarketingWhereInput = {
      isDeleted: false,
      member: {
        organizationId,
        ...(userId && { user: { id: userId } }),
      },
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [referralCounts, liaisonMembers] = await Promise.all([
      this.getReferralCountsByLiaison(
        organizationId,
        startDate,
        endDate,
        userId
      ),
      prisma.member.findMany({
        where: {
          organizationId,
          role: ROLES.LIAISON,
          ...(userId && { user: { id: userId } }),
        },
        select: { id: true, user: { select: { id: true, name: true } } },
      }),
    ]);

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

    // Both maps are keyed by user id — Board.assignedTo references User.id,
    // not Member.id, so lead metrics only match on the user id.
    const analyticsMap = new Map<string, InternalAnalytics>();
    const marketingByMember = new Map<string, typeof marketingLogs>();

    for (const log of marketingLogs) {
      const key = log.member.user.id;
      if (!marketingByMember.has(key)) {
        marketingByMember.set(key, []);
      }
      marketingByMember.get(key)!.push(log);
    }

    // Seeded from the liaison roster as well as the logs, so a liaison holding
    // referrals but no marketing log still gets a card.
    const seed = (key: string, memberId: string, memberName: string) => {
      if (analyticsMap.has(key)) return;
      analyticsMap.set(key, {
        memberId,
        memberName,
        totalLeads: 0,
        newLeads: 0,
        totalReferrals: 0,
        admissions: 0,
        totalInteractions: 0,
        engagementLevel: "Low",

        facilitiesCovered: [],
        peopleContacted: [],
        touchpointsUsed: [],

        _facilitySet: new Set(),
        _peopleSet: new Set(),
        _touchpointMap: new Map(),
      });
    };

    for (const member of liaisonMembers) {
      seed(member.user.id, member.id, member.user.name);
    }

    for (const log of marketingLogs) {
      seed(log.member.user.id, log.memberId, log.member.user.name);
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

    for (const [assignedUserId, counts] of referralCounts.byUser.entries()) {
      const analytics = analyticsMap.get(assignedUserId);
      if (!analytics) continue;

      analytics.totalReferrals = counts.referrals;
      analytics.admissions = counts.admissions;
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
      Array.from(analyticsMap.values()),
      organizationId
    );

    const data = {
      analytics: Array.from(analyticsMap.values()),
      analysis,
      totals: {
        referrals: referralCounts.totals.referrals,
        admissions: referralCounts.totals.admissions,
      },
    };

    await cacheData(
      `marketing_analytics:${organizationId}:${keyPart(startDate)}:${keyPart(endDate)}:${userId}`,
      data,
      60 * 5
    );

    return data;
  }

  // Job ids are queue-sequential, so the payload's organization is the only proof.
  async getJobResult(jobId: string, organizationId: string) {
    const job = await this.geminiQueue.getJob(jobId);
    if (!job || job.data?.organizationId !== organizationId) {
      throw new NotFoundException("Job not found");
    }

    return {
      jobId: job.id,
      status: await job.getState(),
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async analyzeMarketingAnalytics(analytics: any, organizationId: string) {
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
      organizationId,
    });

    const result = await job.waitUntilFinished(this.geminiQueueEvents, 30000);
    return result;
  }
}
