import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CustomAnalyticAggregation,
  CustomAnalyticChartType,
  CustomAnalyticDateBucket,
  CustomAnalyticDimensionType,
  CustomAnalyticMarketingGroupBy,
  CustomAnalyticMarketingMeasure,
  CustomAnalyticMetricSource,
  CustomAnalyticRelationDirection,
  Prisma,
  RelationType,
} from "@prisma/client";
import {
  EMPTY_FILTER,
  filterFieldIds,
  matchesFilter,
  parseFilter,
  type AnalyticFilter,
} from "../../lib/analytics/analytic-filter";
import { seedDefaultAnalytics } from "../../lib/analytics/default-analytics";
import { resolveModuleId } from "../../lib/module/system-modules";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, QueueEvents } from "bullmq";
import { appConfig } from "../../config/app-config";
import { analyticsPrompt } from "../../lib/aws/prompts";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { cacheData, getData, purgeAllCacheKeys } from "../../lib/redis/redis";
import { CACHE_PREFIX } from "../../lib/constant";
import { prisma } from "../../lib/prisma/prisma";
import { runUnscoped } from "../../lib/prisma/tenant-context";
import { renderDashboardPdf } from "./dashboard-pdf";
import {
  ReorderDashboardChartsDto,
  SaveDashboardDto,
  UpdateDashboardDto,
} from "./dto/custom-analytic-dashboard.dto";
import {
  PreviewCustomAnalyticDto,
  SaveCustomAnalyticDto,
  UpdateCustomAnalyticDto,
} from "./dto/custom-analytics.dto";

type AggregationRow = { values: Record<string, string | null> };

type BarPieResult = {
  chartType: "BAR" | "PIE" | "MAP";
  // color is the grouped field option's own colour, absent for any other
  // dimension type or an option that has none.
  data: { name: string; value: number; color?: string }[];
};
type LineResult = {
  chartType: "LINE";
  data: { bucket: string; value: number }[];
};
type KpiResult = {
  chartType: "KPI";
  value: number;
  // A PERCENT aggregation is a rate, not a count, so the unit travels with the
  // value rather than every renderer having to know the aggregation.
  unit?: "percent";
  // Monthly points behind the headline number, for the tile's sparkline.
  series: { bucket: string; value: number }[];
};
type TableResult = {
  chartType: "TABLE";
  columns: { id: string; fieldName: string; fieldType: string }[];
  rows: {
    id: string;
    recordName: string;
    createdAt: Date;
    values: Record<string, string | null>;
  }[];
};

type AggregationResult = BarPieResult | LineResult | KpiResult | TableResult;

type DateWindow = { start: Date; end: Date } | null;

// Loaded once and shared by every chart on a dashboard that reads the same
// module and window; values stay a Map so each chart projects what it needs.
type LoadedRecord = {
  id: string;
  recordName: string;
  createdAt: Date;
  assignedTo: string | null;
  values: Map<string, string | null>;
};

type AggregationConfig = {
  moduleId: string;
  chartType: CustomAnalyticChartType;
  metricFieldId: string | null;
  metricAggregation: CustomAnalyticAggregation;
  dimensionType: CustomAnalyticDimensionType;
  dimensionFieldId: string | null;
  dateBucket: CustomAnalyticDateBucket;
  columnIds: string[];
  filter: AnalyticFilter;
  rangeDays: number | null;
  groupLimit: number | null;
  numeratorFilter: AnalyticFilter;
  minGroupSize: number | null;
  maxGroupSize: number | null;
  relationType: RelationType | null;
  relationDirection: CustomAnalyticRelationDirection;
  relatedFieldId: string | null;
  metricSource: CustomAnalyticMetricSource;
  durationFieldId: string | null;
  marketingMeasure: CustomAnalyticMarketingMeasure;
  marketingGroupBy: CustomAnalyticMarketingGroupBy | null;
  // An explicit window takes precedence over rangeDays. Only ever set by a
  // run request's query params, never persisted on the saved analytic.
  dateWindow?: DateWindow;
};

// Chart order is only meaningful inside a dashboard; createdAt breaks ties so
// a fresh @default(0) collision can never render non-deterministically.
// What every ranked chart used before groupLimit existed, so an analytic that
// does not set one renders exactly as it did.
const DEFAULT_GROUP_LIMIT = 10;

const DASHBOARD_CHART_ORDER: Prisma.CustomAnalyticOrderByWithRelationInput[] = [
  { dashboardOrder: "asc" },
  { createdAt: "asc" },
];

@Injectable()
export class CustomAnalyticsService {
  private aiQueueEvents: QueueEvents | null = null;

  constructor(
    @InjectQueue(QUEUE_NAMES.GEMINI)
    private readonly aiQueue: Queue
  ) {}

  // Opened on first use, so constructing the service never dials Redis - only
  // the insight path needs it, and every other method is queue-free.
  private queueEvents(): QueueEvents {
    this.aiQueueEvents ??= new QueueEvents(QUEUE_NAMES.GEMINI, {
      connection: { url: appConfig.REDIS_URL },
    });

    return this.aiQueueEvents;
  }

  // The ids arrive from the client, so ownership is proven here rather than
  // trusted: a foreign module or field would otherwise be stored and quietly
  // resolve to nothing at run time.
  private async assertOwned(
    organizationId: string,
    moduleId: string,
    fieldIds: string[],
    // Lives on the module at the other end of the relation, so it is proven
    // against the organization rather than against this analytic's module.
    relatedFieldId: string | null = null
  ) {
    if (relatedFieldId) {
      const owned = await prisma.field.count({
        where: { id: relatedFieldId, organizationId },
      });
      if (owned === 0) {
        throw new BadRequestException("Related field not found");
      }
    }

    const module = await prisma.module.findFirst({
      where: { id: moduleId, organizationId },
      select: { id: true },
    });
    if (!module) throw new NotFoundException("Module not found");

    // One field can legitimately fill two slots (a TABLE column that is also
    // the metric), so compare against distinct ids -- count() counts rows.
    const uniqueFieldIds = [...new Set(fieldIds)];

    if (uniqueFieldIds.length > 0) {
      const owned = await prisma.field.count({
        where: { id: { in: uniqueFieldIds }, organizationId, moduleId },
      });
      if (owned !== uniqueFieldIds.length) {
        throw new BadRequestException(
          "Every field must belong to the selected module"
        );
      }
    }
  }

  // dimensionFieldId only counts as an owned field when dimensionType is
  // FIELD — OWNER and DATE modes have no field id to own.
  private ownedFieldIds(config: {
    metricFieldId: string | null;
    dimensionType: CustomAnalyticDimensionType;
    dimensionFieldId: string | null;
    columnIds: string[];
    filter?: unknown;
    numeratorFilter?: unknown;
  }) {
    return [
      ...(config.metricFieldId ? [config.metricFieldId] : []),
      ...(config.dimensionType === "FIELD" && config.dimensionFieldId
        ? [config.dimensionFieldId]
        : []),
      ...config.columnIds,
      // A condition's field is loaded with the record and proven owned like any
      // other: without it the value reads undefined and drops every row.
      ...(config.filter === undefined
        ? []
        : filterFieldIds(parseFilter(config.filter))),
      ...(config.numeratorFilter === undefined
        ? []
        : filterFieldIds(parseFilter(config.numeratorFilter))),
    ];
  }

  // The duration field is proven owned but never loaded with the record: its
  // History rows are the data, and putting it in ownedFieldIds would push its
  // current value into every TABLE response.
  private ownershipFieldIds(config: {
    metricFieldId: string | null;
    dimensionType: CustomAnalyticDimensionType;
    dimensionFieldId: string | null;
    columnIds: string[];
    filter?: unknown;
    numeratorFilter?: unknown;
    durationFieldId?: string | null;
  }) {
    return [
      ...this.ownedFieldIds(config),
      ...(config.durationFieldId ? [config.durationFieldId] : []),
    ];
  }

  // moduleKey narrows the list to one module's charts. unfiled narrows it to
  // the ones on no dashboard, which is the only way to reach them once charts
  // are managed from the dashboard they sit on.
  async getAnalytics(
    organizationId: string,
    moduleKey?: string,
    unfiled = false
  ) {
    const moduleId = moduleKey
      ? await resolveModuleId(moduleKey, organizationId)
      : null;

    return prisma.customAnalytic.findMany({
      where: {
        organizationId,
        ...(moduleId ? { moduleId } : {}),
        ...(unfiled ? { dashboardId: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { module: { select: { key: true, label: true } } },
    });
  }

  async getAnalytic(id: string, organizationId: string) {
    const analytic = await prisma.customAnalytic.findFirst({
      where: { id, organizationId },
      include: { module: { select: { key: true, label: true } } },
    });

    if (!analytic) throw new NotFoundException("Custom analytic not found");

    return analytic;
  }

  // A chart created from inside a dashboard joins it in the same write, so it
  // cannot end up saved but unattached when the second call fails.
  private async nextDashboardOrder(
    dashboardId: string,
    organizationId: string
  ) {
    const dashboard = await prisma.customAnalyticDashboard.findFirst({
      where: { id: dashboardId, organizationId },
      select: { id: true },
    });
    if (!dashboard) throw new NotFoundException("Dashboard not found");

    const last = await prisma.customAnalytic.findFirst({
      where: { dashboardId, organizationId },
      orderBy: { dashboardOrder: "desc" },
      select: { dashboardOrder: true },
    });

    return (last?.dashboardOrder ?? -1) + 1;
  }

  async createAnalytic(
    dto: SaveCustomAnalyticDto,
    organizationId: string,
    userId: string
  ) {
    await this.assertOwned(
      organizationId,
      dto.moduleId,
      this.ownershipFieldIds(dto),
      dto.relatedFieldId
    );

    await this.purgeRunCache(organizationId);

    return prisma.customAnalytic.create({
      data: {
        name: dto.name,
        chartType: dto.chartType,
        metricFieldId: dto.metricFieldId,
        metricAggregation: dto.metricAggregation,
        dimensionType: dto.dimensionType,
        dimensionFieldId: dto.dimensionFieldId,
        dateBucket: dto.dateBucket,
        columnIds: dto.columnIds,
        filter: dto.filter as Prisma.InputJsonValue,
        rangeDays: dto.rangeDays,
        groupLimit: dto.groupLimit,
        tileSpan: dto.tileSpan,
        numeratorFilter: dto.numeratorFilter as Prisma.InputJsonValue,
        minGroupSize: dto.minGroupSize,
        maxGroupSize: dto.maxGroupSize,
        relationType: dto.relationType,
        relationDirection: dto.relationDirection,
        relatedFieldId: dto.relatedFieldId,
        metricSource: dto.metricSource,
        durationFieldId: dto.durationFieldId,
        marketingMeasure: dto.marketingMeasure,
        marketingGroupBy: dto.marketingGroupBy,
        moduleId: dto.moduleId,
        organizationId,
        createdBy: userId,
        ...(dto.dashboardId
          ? {
              dashboardId: dto.dashboardId,
              dashboardOrder: await this.nextDashboardOrder(
                dto.dashboardId,
                organizationId
              ),
            }
          : {}),
      },
    });
  }

  async updateAnalytic(
    id: string,
    dto: UpdateCustomAnalyticDto,
    organizationId: string
  ) {
    const existing = await this.getAnalytic(id, organizationId);

    const moduleId = dto.moduleId ?? existing.moduleId;
    const fieldIds = this.ownershipFieldIds({
      metricFieldId:
        dto.metricFieldId !== undefined
          ? dto.metricFieldId
          : existing.metricFieldId,
      dimensionType: dto.dimensionType ?? existing.dimensionType,
      dimensionFieldId:
        dto.dimensionFieldId !== undefined
          ? dto.dimensionFieldId
          : existing.dimensionFieldId,
      columnIds: dto.columnIds ?? existing.columnIds,
      filter: dto.filter ?? existing.filter,
      numeratorFilter: dto.numeratorFilter ?? existing.numeratorFilter,
      durationFieldId:
        dto.durationFieldId !== undefined
          ? dto.durationFieldId
          : existing.durationFieldId,
    });
    await this.assertOwned(
      organizationId,
      moduleId,
      fieldIds,
      dto.relatedFieldId !== undefined
        ? dto.relatedFieldId
        : existing.relatedFieldId
    );

    await this.purgeRunCache(organizationId);

    return prisma.customAnalytic.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.moduleId !== undefined && { moduleId: dto.moduleId }),
        ...(dto.chartType !== undefined && { chartType: dto.chartType }),
        ...(dto.metricFieldId !== undefined && {
          metricFieldId: dto.metricFieldId,
        }),
        ...(dto.metricAggregation !== undefined && {
          metricAggregation: dto.metricAggregation,
        }),
        ...(dto.dimensionType !== undefined && {
          dimensionType: dto.dimensionType,
        }),
        ...(dto.dimensionFieldId !== undefined && {
          dimensionFieldId: dto.dimensionFieldId,
        }),
        ...(dto.dateBucket !== undefined && { dateBucket: dto.dateBucket }),
        ...(dto.columnIds !== undefined && { columnIds: dto.columnIds }),
        ...(dto.filter !== undefined && {
          filter: dto.filter as Prisma.InputJsonValue,
        }),
        ...(dto.rangeDays !== undefined && { rangeDays: dto.rangeDays }),
        ...(dto.groupLimit !== undefined && { groupLimit: dto.groupLimit }),
        ...(dto.tileSpan !== undefined && { tileSpan: dto.tileSpan }),
        ...(dto.numeratorFilter !== undefined && {
          numeratorFilter: dto.numeratorFilter as Prisma.InputJsonValue,
        }),
        ...(dto.minGroupSize !== undefined && {
          minGroupSize: dto.minGroupSize,
        }),
        ...(dto.maxGroupSize !== undefined && {
          maxGroupSize: dto.maxGroupSize,
        }),
        ...(dto.relationType !== undefined && {
          relationType: dto.relationType,
        }),
        ...(dto.relationDirection !== undefined && {
          relationDirection: dto.relationDirection,
        }),
        ...(dto.relatedFieldId !== undefined && {
          relatedFieldId: dto.relatedFieldId,
        }),
        ...(dto.metricSource !== undefined && {
          metricSource: dto.metricSource,
        }),
        ...(dto.durationFieldId !== undefined && {
          durationFieldId: dto.durationFieldId,
        }),
        ...(dto.marketingMeasure !== undefined && {
          marketingMeasure: dto.marketingMeasure,
        }),
        ...(dto.marketingGroupBy !== undefined && {
          marketingGroupBy: dto.marketingGroupBy,
        }),
      },
    });
  }

  async deleteAnalytic(id: string, organizationId: string) {
    await this.getAnalytic(id, organizationId);

    await prisma.customAnalytic.delete({ where: { id } });
    await this.purgeRunCache(organizationId);

    return { message: "Custom analytic deleted successfully" };
  }

  // Mirrors assertOwned: analyticIds arrive from the client, so membership is
  // proven by count rather than trusted, guarding against cross-org ids.
  private async assertAnalyticsOwned(
    organizationId: string,
    analyticIds: string[]
  ) {
    if (analyticIds.length === 0) return;

    const owned = await prisma.customAnalytic.count({
      where: { id: { in: analyticIds }, organizationId },
    });
    if (owned !== analyticIds.length) {
      throw new BadRequestException(
        "Every chart must belong to this organization"
      );
    }
  }

  async getDashboards(organizationId: string) {
    return prisma.customAnalyticDashboard.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        analytics: {
          orderBy: DASHBOARD_CHART_ORDER,
          select: { id: true, name: true, chartType: true, tileSpan: true },
        },
      },
    });
  }

  // Existing organizations predate default seeding, so a first visit seeds the
  // page instead of 404ing. seedDefaultAnalytics is idempotent.
  async getDefaultDashboard(moduleKey: string, organizationId: string) {
    const moduleId = await resolveModuleId(moduleKey, organizationId);

    const existing = await prisma.customAnalyticDashboard.findFirst({
      where: { organizationId, moduleId, isDefault: true },
      select: { id: true },
    });

    const seeded =
      existing ?? (await seedDefaultAnalytics(moduleId, organizationId));

    if (!seeded) {
      throw new NotFoundException("No analytics available for this module");
    }

    return this.getDashboard(seeded.id, organizationId);
  }

  async getDashboard(id: string, organizationId: string) {
    const dashboard = await prisma.customAnalyticDashboard.findFirst({
      where: { id, organizationId },
      include: {
        analytics: {
          orderBy: DASHBOARD_CHART_ORDER,
          include: { module: { select: { key: true, label: true } } },
        },
      },
    });

    if (!dashboard) throw new NotFoundException("Dashboard not found");

    return dashboard;
  }

  async createDashboard(
    dto: SaveDashboardDto,
    organizationId: string,
    userId: string
  ) {
    await this.assertAnalyticsOwned(organizationId, dto.analyticIds);
    await this.purgeRunCache(organizationId);

    const orderedIds = [...new Set(dto.analyticIds)];

    return prisma.$transaction(async (tx) => {
      const dashboard = await tx.customAnalyticDashboard.create({
        data: { name: dto.name, organizationId, createdBy: userId },
      });

      // Sequential, not Promise.all: an interactive transaction holds one
      // connection, mirroring task.service.ts's renumber loop.
      for (const [index, analyticId] of orderedIds.entries()) {
        await tx.customAnalytic.updateMany({
          where: { id: analyticId, organizationId },
          data: { dashboardId: dashboard.id, dashboardOrder: index },
        });
      }

      return tx.customAnalyticDashboard.findFirstOrThrow({
        where: { id: dashboard.id, organizationId },
        include: {
          analytics: {
            orderBy: DASHBOARD_CHART_ORDER,
            select: { id: true, name: true, chartType: true },
          },
        },
      });
    });
  }

  async updateDashboard(
    id: string,
    dto: UpdateDashboardDto,
    organizationId: string
  ) {
    const existing = await this.getDashboard(id, organizationId);

    // A module's seeded page is the standard report: its name and the charts on
    // it are fixed, though each chart's own definition stays editable.
    if (existing.isDefault) {
      throw new BadRequestException(
        "A module's analytics page cannot be renamed or have its charts changed"
      );
    }

    if (dto.analyticIds !== undefined) {
      await this.assertAnalyticsOwned(organizationId, dto.analyticIds);
    }

    await this.purgeRunCache(organizationId);

    return prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.customAnalyticDashboard.update({
          where: { id },
          data: { name: dto.name },
        });
      }

      if (dto.analyticIds !== undefined) {
        const nextIds = [...new Set(dto.analyticIds)];
        const nextSet = new Set(nextIds);
        const existingIds = existing.analytics.map((analytic) => analytic.id);
        const existingSet = new Set(existingIds);

        // Surviving members keep the order drag-and-drop gave them; the edit
        // dialog's MultiSelect does not model order, so its array order is only
        // used to sequence genuinely new members, which append to the end.
        const kept = existingIds.filter((analyticId) =>
          nextSet.has(analyticId)
        );
        const added = nextIds.filter(
          (analyticId) => !existingSet.has(analyticId)
        );
        const ordered = [...kept, ...added];

        // Detach dropped members and clear their now-meaningless order.
        await tx.customAnalytic.updateMany({
          where: {
            organizationId,
            dashboardId: id,
            ...(ordered.length > 0 && { id: { notIn: ordered } }),
          },
          data: { dashboardId: null, dashboardOrder: 0 },
        });

        for (const [index, analyticId] of ordered.entries()) {
          await tx.customAnalytic.updateMany({
            where: { id: analyticId, organizationId },
            data: { dashboardId: id, dashboardOrder: index },
          });
        }
      }

      return tx.customAnalyticDashboard.findFirstOrThrow({
        where: { id, organizationId },
        include: {
          analytics: {
            orderBy: DASHBOARD_CHART_ORDER,
            select: { id: true, name: true, chartType: true },
          },
        },
      });
    });
  }

  // Membership and order both change what a cached run returns.

  // Org scoping is enforced three times: the dashboard lookup filters on
  // organizationId, membership is derived from that dashboard's own relation
  // rather than client input, and each write re-filters on org + dashboard.
  async reorderDashboardCharts(
    id: string,
    dto: ReorderDashboardChartsDto,
    organizationId: string
  ): Promise<{ id: string; analyticIds: string[] }> {
    return prisma.$transaction(async (tx) => {
      // Read membership inside the transaction so a concurrent membership edit
      // cannot slip between the check and the writes.
      const dashboard = await tx.customAnalyticDashboard.findFirst({
        where: { id, organizationId },
        select: { id: true, analytics: { select: { id: true } } },
      });
      if (!dashboard) throw new NotFoundException("Dashboard not found");

      const currentIds = new Set(dashboard.analytics.map((a) => a.id));
      const nextIds = dto.analyticIds;

      // Exact set equality in one comparison: duplicates are rejected by the
      // Zod schema, and length + membership together reject a foreign id, a
      // chart from another org, a chart on another dashboard, and a partial or
      // stale array (someone else added/removed a chart mid-drag).
      if (
        nextIds.length !== currentIds.size ||
        nextIds.some((analyticId) => !currentIds.has(analyticId))
      ) {
        throw new BadRequestException(
          "analyticIds must list exactly this dashboard's charts"
        );
      }

      for (const [index, analyticId] of nextIds.entries()) {
        await tx.customAnalytic.updateMany({
          where: { id: analyticId, organizationId, dashboardId: id },
          data: { dashboardOrder: index },
        });
      }

      await this.purgeRunCache(organizationId);

      return { id, analyticIds: nextIds };
    });
  }

  async deleteDashboard(id: string, organizationId: string) {
    const dashboard = await this.getDashboard(id, organizationId);

    if (dashboard.isDefault) {
      throw new BadRequestException(
        "A module's analytics page cannot be deleted"
      );
    }

    // DB-level SetNull nulls dashboardId but cannot zero dashboardOrder.
    await prisma.$transaction([
      prisma.customAnalytic.updateMany({
        where: { organizationId, dashboardId: id },
        data: { dashboardId: null, dashboardOrder: 0 },
      }),
      prisma.customAnalyticDashboard.delete({ where: { id } }),
    ]);

    await this.purgeRunCache(organizationId);

    return { message: "Dashboard deleted successfully" };
  }

  // The insight is generated from whatever the dashboard actually renders, so a
  // module with charts nobody hardcoded still gets one. Same JSON shape the
  // legacy referral panel renders, so the sections map straight across.
  async getDashboardInsights(
    id: string,
    organizationId: string,
    dateWindow: DateWindow = null,
    force = false
  ) {
    const window = dateWindow
      ? `${dateWindow.start.toISOString()}:${dateWindow.end.toISOString()}`
      : "all";
    const cacheKey = `dashboard_insights:${organizationId}:${id}:${window}`;

    if (!force) {
      const cached = await getData(cacheKey);
      if (cached) return cached;
    }

    const dashboard = await this.runDashboard(id, organizationId, dateWindow);

    // Only the numbers go to the model: names and results, no record rows.
    const summary = dashboard.charts.map((chart) => ({
      name: chart.name,
      chartType: chart.chartType,
      result:
        chart.result.chartType === "TABLE"
          ? { rowCount: chart.result.rows.length }
          : chart.result,
    }));

    const job = await this.aiQueue.add("gemini", {
      type: "analytics-summary",
      prompt: analyticsPrompt({ dashboard: dashboard.name, charts: summary }),
      organizationId,
    });

    const result = await job.waitUntilFinished(this.queueEvents(), 30000);
    await cacheData(cacheKey, result, 60 * 5);

    return result;
  }

  // Reuses runDashboard, so the document and the screen read the same numbers
  // from the same cache entry.
  async renderDashboardPdf(
    id: string,
    organizationId: string,
    dateWindow: DateWindow = null
  ) {
    const [dashboard, organization] = await Promise.all([
      this.runDashboard(id, organizationId, dateWindow),
      runUnscoped(() =>
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        })
      ),
    ]);

    return renderDashboardPdf({
      organizationName: organization?.name ?? "Organization",
      dashboard: dashboard as never,
      startDate: dateWindow?.start,
      endDate: dateWindow?.end,
    });
  }

  async runDashboard(
    id: string,
    organizationId: string,
    dateWindow: DateWindow = null,
    limit: number | null = null
  ) {
    const cacheKey = this.runCacheKey(
      organizationId,
      "dashboard",
      id,
      dateWindow,
      limit
    );
    const cached = await getData(cacheKey);
    if (cached) return cached;

    const dashboard = await this.getDashboard(id, organizationId);

    // Each chart is one unbounded Board scan, so the list page asks for only
    // the first. Null means "all", preserving the view page's behaviour.
    const members =
      limit === null
        ? dashboard.analytics
        : dashboard.analytics.slice(0, limit);

    const configs = members.map((analytic) => ({
      analytic,
      config: { ...this.analyticToConfig(analytic), dateWindow },
    }));

    // Charts reading the same module over the same window share one Board
    // scan. Without this a twelve-chart dashboard ran twelve full scans, each
    // decrypting every value it touched.
    const loads = new Map<
      string,
      { config: AggregationConfig; fieldIds: Set<string> }
    >();

    for (const { config } of configs) {
      const key = this.loadKey(config);
      const existing = loads.get(key);
      const fieldIds = existing?.fieldIds ?? new Set<string>();
      for (const fieldId of this.ownedFieldIds(config)) fieldIds.add(fieldId);
      if (!existing) loads.set(key, { config, fieldIds });
    }

    const records = new Map<string, LoadedRecord[]>();
    await Promise.all(
      [...loads.entries()].map(async ([key, load]) => {
        records.set(
          key,
          await this.loadRecords(load.config, organizationId, [
            ...load.fieldIds,
          ])
        );
      })
    );

    const charts = await Promise.all(
      configs.map(async ({ analytic, config }) => ({
        id: analytic.id,
        name: analytic.name,
        chartType: analytic.chartType,
        tileSpan: analytic.tileSpan,
        moduleKey: analytic.module.key,
        result: await this.computeFromRecords(
          records.get(this.loadKey(config)) ?? [],
          config,
          organizationId
        ),
      }))
    );

    const result = {
      id: dashboard.id,
      name: dashboard.name,
      // Total membership, not charts.length - the list card needs "+N more".
      chartCount: dashboard.analytics.length,
      charts,
    };

    await cacheData(cacheKey, result, CustomAnalyticsService.RUN_CACHE_TTL);

    return result;
  }

  // A grouped field's options carry the colours the board already shows, so a
  // status breakdown is not recoloured by the chart's own ramp.
  private async withOptionColors(
    data: { name: string; value: number }[],
    dimensionFieldId: string | null,
    organizationId: string
  ) {
    if (!dimensionFieldId || data.length === 0) return data;

    const options = await prisma.fieldOption.findMany({
      where: {
        fieldId: dimensionFieldId,
        isDeleted: false,
        field: { organizationId },
      },
      select: { optionName: true, color: true },
    });

    if (options.length === 0) return data;

    const colors = new Map(
      options
        .filter((option) => option.color)
        .map((option) => [option.optionName, option.color as string])
    );

    return data.map((group) => ({
      ...group,
      ...(colors.has(group.name) && { color: colors.get(group.name) }),
    }));
  }

  // Five minutes, matching the legacy analytics endpoints. Record edits are not
  // pushed through this cache, so a chart can lag a board change by that much.
  private static readonly RUN_CACHE_TTL = 60 * 5;

  private runCacheKey(
    organizationId: string,
    kind: "chart" | "dashboard",
    id: string,
    dateWindow: DateWindow,
    limit: number | null = null
  ) {
    const window = dateWindow
      ? `${dateWindow.start.toISOString()}:${dateWindow.end.toISOString()}`
      : "all";

    return `${CACHE_PREFIX.CUSTOM_ANALYTICS}:${organizationId}:${kind}:${id}:${window}:${limit ?? "all"}`;
  }

  // Any edit to a chart or a dashboard can change every cached run in the
  // organization, so the whole prefix goes rather than one key.
  private async purgeRunCache(organizationId: string) {
    await purgeAllCacheKeys(
      `${CACHE_PREFIX.CUSTOM_ANALYTICS}:${organizationId}`
    );
  }

  // An explicit window overrides rangeDays, so when one is set every chart on
  // the module reads the same rows regardless of its own range.
  private loadKey(config: AggregationConfig): string {
    return config.dateWindow
      ? `${config.moduleId}:window`
      : `${config.moduleId}:${config.rangeDays ?? "all"}`;
  }

  // Shared by runAnalytic and runDashboard so a dashboard's member charts are
  // computed with the exact same config shape as running one chart alone.
  private analyticToConfig(analytic: {
    moduleId: string;
    chartType: CustomAnalyticChartType;
    metricFieldId: string | null;
    metricAggregation: CustomAnalyticAggregation;
    dimensionType: CustomAnalyticDimensionType;
    dimensionFieldId: string | null;
    dateBucket: CustomAnalyticDateBucket | null;
    columnIds: string[];
    filter: unknown;
    rangeDays: number | null;
    groupLimit: number | null;
    numeratorFilter: unknown;
    minGroupSize: number | null;
    maxGroupSize: number | null;
    relationType: RelationType | null;
    relationDirection: CustomAnalyticRelationDirection;
    relatedFieldId: string | null;
    metricSource: CustomAnalyticMetricSource;
    durationFieldId: string | null;
    marketingMeasure: CustomAnalyticMarketingMeasure;
    marketingGroupBy: CustomAnalyticMarketingGroupBy | null;
  }): AggregationConfig {
    return {
      moduleId: analytic.moduleId,
      chartType: analytic.chartType,
      metricFieldId: analytic.metricFieldId,
      metricAggregation: analytic.metricAggregation,
      dimensionType: analytic.dimensionType,
      dimensionFieldId: analytic.dimensionFieldId,
      dateBucket: analytic.dateBucket ?? "DAY",
      columnIds: analytic.columnIds,
      filter: parseFilter(analytic.filter),
      rangeDays: analytic.rangeDays,
      groupLimit: analytic.groupLimit,
      numeratorFilter: parseFilter(analytic.numeratorFilter),
      minGroupSize: analytic.minGroupSize,
      maxGroupSize: analytic.maxGroupSize,
      relationType: analytic.relationType,
      relationDirection: analytic.relationDirection,
      relatedFieldId: analytic.relatedFieldId,
      metricSource: analytic.metricSource,
      durationFieldId: analytic.durationFieldId,
      marketingMeasure: analytic.marketingMeasure,
      marketingGroupBy: analytic.marketingGroupBy,
    };
  }

  async runAnalytic(
    id: string,
    organizationId: string,
    dateWindow: DateWindow = null
  ) {
    const cacheKey = this.runCacheKey(organizationId, "chart", id, dateWindow);
    const cached = await getData(cacheKey);
    if (cached) return cached;

    const analytic = await this.getAnalytic(id, organizationId);

    const result = await this.computeAggregation(
      { ...this.analyticToConfig(analytic), dateWindow },
      organizationId
    );

    await cacheData(cacheKey, result, CustomAnalyticsService.RUN_CACHE_TTL);

    return result;
  }

  async previewAnalytic(dto: PreviewCustomAnalyticDto, organizationId: string) {
    await this.assertOwned(
      organizationId,
      dto.moduleId,
      this.ownershipFieldIds(dto),
      dto.relatedFieldId
    );

    return this.computeAggregation(
      {
        moduleId: dto.moduleId,
        chartType: dto.chartType,
        metricFieldId: dto.metricFieldId,
        metricAggregation: dto.metricAggregation,
        dimensionType: dto.dimensionType,
        dimensionFieldId: dto.dimensionFieldId,
        dateBucket: dto.dateBucket,
        columnIds: dto.columnIds,
        filter: parseFilter(dto.filter),
        rangeDays: dto.rangeDays,
        groupLimit: dto.groupLimit,
        numeratorFilter: parseFilter(dto.numeratorFilter),
        minGroupSize: dto.minGroupSize,
        maxGroupSize: dto.maxGroupSize,
        relationType: dto.relationType,
        relationDirection: dto.relationDirection,
        relatedFieldId: dto.relatedFieldId,
        metricSource: dto.metricSource,
        durationFieldId: dto.durationFieldId,
        marketingMeasure: dto.marketingMeasure,
        marketingGroupBy: dto.marketingGroupBy,
      },
      organizationId
    );
  }

  // Shared by LINE (always date-bucketed) and DATE-mode BAR/PIE grouping — one
  // bucketing implementation instead of a hardcoded day slice in each branch.
  private bucketDate(date: Date, bucket: CustomAnalyticDateBucket): string {
    const iso = date.toISOString();
    if (bucket === "DAY") return iso.slice(0, 10);
    if (bucket === "MONTH") return iso.slice(0, 7);

    // WEEK: the Monday of that ISO week, so buckets sort and dedupe correctly.
    const d = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const isoDay = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - isoDay + 1);
    return d.toISOString().slice(0, 10);
  }

  // Queries Board/FieldValue directly and keys every row by fieldId, never by
  // fieldName, since two fields in the same module can share a name. fieldIds
  // is the union across every chart sharing this load, which is why it is a
  // parameter rather than read off the config.
  private async loadRecords(
    config: Pick<AggregationConfig, "moduleId" | "rangeDays" | "dateWindow">,
    organizationId: string,
    fieldIds: string[]
  ): Promise<LoadedRecord[]> {
    const records = await prisma.board.findMany({
      where: {
        organizationId,
        moduleId: config.moduleId,
        isDeleted: false,
        ...(config.dateWindow
          ? {
              createdAt: {
                gte: config.dateWindow.start,
                lte: config.dateWindow.end,
              },
            }
          : config.rangeDays
            ? {
                createdAt: {
                  gte: new Date(Date.now() - config.rangeDays * 86_400_000),
                },
              }
            : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recordName: true,
        createdAt: true,
        assignedTo: true,
        values: {
          where: { fieldId: { in: fieldIds } },
          select: { fieldId: true, value: true },
        },
      },
    });

    return records.map((record) => ({
      id: record.id,
      recordName: record.recordName,
      createdAt: record.createdAt,
      assignedTo: record.assignedTo,
      values: new Map(
        record.values.map((value) => [value.fieldId, value.value])
      ),
    }));
  }

  private async computeAggregation(
    config: AggregationConfig,
    organizationId: string
  ): Promise<AggregationResult> {
    // Outreach charts read Marketing, never the board, so the record scan is
    // skipped rather than loaded and thrown away.
    if (config.metricSource === "MARKETING_ACTIVITY") {
      return this.computeMarketingAggregation(config, organizationId);
    }

    const records = await this.loadRecords(
      config,
      organizationId,
      this.ownedFieldIds(config)
    );

    return this.computeFromRecords(records, config, organizationId);
  }

  // Projects each record down to the fields this chart reads, so a shared load
  // never leaks a sibling chart's columns into a TABLE response.
  private async computeFromRecords(
    records: LoadedRecord[],
    config: AggregationConfig,
    organizationId: string
  ): Promise<AggregationResult> {
    if (config.metricSource === "MARKETING_ACTIVITY") {
      return this.computeMarketingAggregation(config, organizationId);
    }

    const neededFieldIds = this.ownedFieldIds(config);

    const rows = records
      .map((record) => ({
        id: record.id,
        recordName: record.recordName,
        createdAt: record.createdAt,
        assignedTo: record.assignedTo,
        values: Object.fromEntries(
          neededFieldIds.map((fieldId) => [
            fieldId,
            record.values.get(fieldId) ?? null,
          ])
        ),
      }))
      .filter((row) => matchesFilter(config.filter, row.values));

    if (config.metricSource === "DAYS_TO_CHANGE") {
      return this.computeDurationAggregation(rows, config);
    }

    switch (config.chartType) {
      case "TABLE": {
        const columns = await prisma.field.findMany({
          where: { id: { in: config.columnIds }, organizationId },
          select: { id: true, fieldName: true, fieldType: true },
        });
        const orderedColumns = config.columnIds
          .map((id) => columns.find((column) => column.id === id))
          .filter((column) => column !== undefined);
        return { chartType: "TABLE", columns: orderedColumns, rows };
      }

      case "KPI": {
        // The tile shows a sparkline and a month-over-month delta, both read
        // off the same rows the headline number is aggregated from.
        const monthly = new Map<string, typeof rows>();
        for (const row of rows) {
          const key = this.bucketDate(row.createdAt, "MONTH");
          monthly.set(key, [...(monthly.get(key) ?? []), row]);
        }

        return {
          chartType: "KPI",
          value: this.aggregate(
            rows,
            config.metricFieldId,
            config.metricAggregation,
            config.numeratorFilter
          ),
          ...(config.metricAggregation === "PERCENT" && {
            unit: "percent" as const,
          }),
          series: [...monthly.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([bucket, monthRows]) => ({
              bucket,
              value: this.aggregate(
                monthRows,
                config.metricFieldId,
                config.metricAggregation,
                config.numeratorFilter
              ),
            })),
        };
      }

      // A map groups exactly like a bar chart; only the rendering differs.
      case "BAR":
      case "PIE":
      case "MAP": {
        if (config.dimensionType === "OWNER") {
          return {
            chartType: config.chartType,
            data: await this.groupByOwner(rows, config),
          };
        }

        if (config.dimensionType === "RELATED_RECORD") {
          return {
            chartType: config.chartType,
            data: await this.groupByRelatedRecord(rows, config, organizationId),
          };
        }

        if (config.dimensionType === "DATE") {
          const bucket = config.dateBucket ?? "DAY";
          const groups = new Map<string, typeof rows>();
          for (const row of rows) {
            const key = this.bucketDate(row.createdAt, bucket);
            groups.set(key, [...(groups.get(key) ?? []), row]);
          }
          // Chronological, not ranked — this is a time series, not a top-N list.
          const data = [...groups.entries()]
            .filter(([, groupRows]) =>
              this.withinGroupBounds(groupRows.length, config)
            )
            .map(([name, groupRows]) => ({
              name,
              value: this.aggregate(
                groupRows,
                config.metricFieldId,
                config.metricAggregation,
                config.numeratorFilter
              ),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          return { chartType: config.chartType, data };
        }

        // FIELD grouping, including "group by status" — a STATUS-typed field
        // grouped exactly like any other field, no special case needed.
        const groups = new Map<string, typeof rows>();
        for (const row of rows) {
          const key = config.dimensionFieldId
            ? (row.values[config.dimensionFieldId] ?? "Unknown")
            : "Unknown";
          groups.set(key, [...(groups.get(key) ?? []), row]);
        }
        const data = [...groups.entries()]
          .filter(([, groupRows]) =>
            this.withinGroupBounds(groupRows.length, config)
          )
          .map(([name, groupRows]) => ({
            name,
            value: this.aggregate(
              groupRows,
              config.metricFieldId,
              config.metricAggregation,
              config.numeratorFilter
            ),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, config.groupLimit ?? DEFAULT_GROUP_LIMIT);

        return {
          chartType: config.chartType,
          data: await this.withOptionColors(
            data,
            config.dimensionFieldId,
            organizationId
          ),
        };
      }

      case "LINE": {
        const bucket = config.dateBucket ?? "DAY";
        const groups = new Map<string, typeof rows>();
        for (const row of rows) {
          const key = this.bucketDate(row.createdAt, bucket);
          groups.set(key, [...(groups.get(key) ?? []), row]);
        }
        const data = [...groups.entries()]
          .filter(([, groupRows]) =>
            this.withinGroupBounds(groupRows.length, config)
          )
          .map(([bucket, groupRows]) => ({
            bucket,
            value: this.aggregate(
              groupRows,
              config.metricFieldId,
              config.metricAggregation,
              config.numeratorFilter
            ),
          }))
          .sort((a, b) => a.bucket.localeCompare(b.bucket));
        return { chartType: "LINE", data };
      }
    }
  }

  // Resolves Board.assignedTo (a scalar column, not a Field/FieldValue row) to
  // display names with one lookup, mirroring board.service.ts's own
  // record.assignedUser?.name pattern.
  private async groupByOwner(
    rows: {
      assignedTo: string | null;
      values: Record<string, string | null>;
    }[],
    config: {
      metricFieldId: string | null;
      metricAggregation: CustomAnalyticAggregation;
      groupLimit: number | null;
      numeratorFilter: AnalyticFilter;
      minGroupSize: number | null;
      maxGroupSize: number | null;
    }
  ) {
    const UNASSIGNED = "__unassigned__";
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.assignedTo ?? UNASSIGNED;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    const ids = [...groups.keys()].filter((key) => key !== UNASSIGNED);
    const users =
      ids.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(users.map((user) => [user.id, user.name]));

    return [...groups.entries()]
      .filter(([, groupRows]) =>
        this.withinGroupBounds(groupRows.length, config)
      )
      .map(([key, groupRows]) => ({
        name:
          key === UNASSIGNED
            ? "Unassigned"
            : (nameById.get(key) ?? "Unassigned"),
        value: this.aggregate(
          groupRows,
          config.metricFieldId,
          config.metricAggregation,
          config.numeratorFilter
        ),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, config.groupLimit ?? DEFAULT_GROUP_LIMIT);
  }

  // Liaison outreach, read from Marketing. The rows are outreach logs keyed by
  // member, so nothing here touches the board: no field, no filter, no
  // relation. What is counted is the measure, not metricAggregation.
  private async computeMarketingAggregation(
    config: AggregationConfig,
    organizationId: string
  ): Promise<AggregationResult> {
    if (config.chartType === "TABLE") {
      throw new BadRequestException(
        "An outreach metric cannot be rendered as a table"
      );
    }

    const logs = await prisma.marketing.findMany({
      where: {
        organizationId,
        isDeleted: false,
        ...(config.dateWindow
          ? {
              createdAt: {
                gte: config.dateWindow.start,
                lte: config.dateWindow.end,
              },
            }
          : config.rangeDays
            ? {
                createdAt: {
                  gte: new Date(Date.now() - config.rangeDays * 86_400_000),
                },
              }
            : {}),
      },
      select: {
        facility: true,
        talkedTo: true,
        touchpoints: true,
        createdAt: true,
        member: { select: { user: { select: { name: true } } } },
        user: { select: { name: true } },
      },
    });

    if (config.chartType === "KPI") {
      return {
        chartType: "KPI",
        value: this.measureLogs(logs, config.marketingMeasure),
        series: [],
      };
    }

    if (config.chartType === "LINE") {
      const bucket = config.dateBucket ?? "MONTH";
      const groups = new Map<string, typeof logs>();
      for (const log of logs) {
        const key = this.bucketDate(log.createdAt, bucket);
        groups.set(key, [...(groups.get(key) ?? []), log]);
      }

      return {
        chartType: "LINE",
        data: [...groups.entries()]
          .filter(([, group]) => this.withinGroupBounds(group.length, config))
          .map(([key, group]) => ({
            bucket: key,
            value: this.measureLogs(group, config.marketingMeasure),
          }))
          .sort((a, b) => a.bucket.localeCompare(b.bucket)),
      };
    }

    // A log carries several touchpoints, so grouping by touchpoint puts it in
    // each of them - the same way the hardcoded touchpoint tally counted.
    const groups = new Map<string, typeof logs>();
    for (const log of logs) {
      const keys =
        config.marketingGroupBy === "TOUCHPOINT"
          ? log.touchpoints.map((touchpoint) => String(touchpoint))
          : config.marketingGroupBy === "FACILITY"
            ? [log.facility]
            : [log.member?.user.name ?? log.user?.name ?? "Former member"];

      for (const key of keys) {
        if (!key) continue;
        groups.set(key, [...(groups.get(key) ?? []), log]);
      }
    }

    return {
      chartType: config.chartType,
      data: [...groups.entries()]
        .filter(([, group]) => this.withinGroupBounds(group.length, config))
        .map(([name, group]) => ({
          name,
          value: this.measureLogs(group, config.marketingMeasure),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, config.groupLimit ?? DEFAULT_GROUP_LIMIT),
    };
  }

  // FACILITIES and PEOPLE are distinct counts, which is what the hardcoded
  // page's facilitiesCovered and peopleContacted sets were.
  private measureLogs(
    logs: { facility: string; talkedTo: string }[],
    measure: CustomAnalyticMarketingMeasure
  ): number {
    if (measure === "FACILITIES") {
      return new Set(logs.map((log) => log.facility).filter(Boolean)).size;
    }
    if (measure === "PEOPLE") {
      return new Set(logs.map((log) => log.talkedTo).filter(Boolean)).size;
    }
    return logs.length;
  }

  // Days from a record's creation to each change of the tracked field, read
  // from History. The rows here are change events, not records, so a record
  // that changed three times contributes three of them - which is what the
  // hardcoded average-time metrics counted.
  private async computeDurationAggregation(
    rows: { id: string; createdAt: Date }[],
    config: AggregationConfig
  ): Promise<AggregationResult> {
    const events = await this.loadDurationEvents(rows, config);

    switch (config.chartType) {
      case "KPI": {
        // Same monthly sparkline as a field-value KPI, bucketed on the change
        // date rather than the record's creation date.
        const monthly = new Map<string, typeof events>();
        for (const event of events) {
          const key = this.bucketDate(event.changedAt, "MONTH");
          monthly.set(key, [...(monthly.get(key) ?? []), event]);
        }

        return {
          chartType: "KPI",
          value: this.aggregateDays(events, config),
          series: [...monthly.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([bucket, monthEvents]) => ({
              bucket,
              value: this.aggregateDays(monthEvents, config),
            })),
        };
      }

      case "LINE": {
        const bucket = config.dateBucket ?? "DAY";
        const groups = new Map<string, typeof events>();
        for (const event of events) {
          const key = this.bucketDate(event.changedAt, bucket);
          groups.set(key, [...(groups.get(key) ?? []), event]);
        }

        return {
          chartType: "LINE",
          data: [...groups.entries()]
            .filter(([, group]) => this.withinGroupBounds(group.length, config))
            .map(([bucket, group]) => ({
              bucket,
              value: this.aggregateDays(group, config),
            }))
            .sort((a, b) => a.bucket.localeCompare(b.bucket)),
        };
      }

      // A map groups exactly like a bar chart; only the rendering differs.
      case "BAR":
      case "PIE":
      case "MAP": {
        // Grouped by the value the field changed to, so "average days to
        // Admitted" falls out without naming a status in code.
        const groups = new Map<string, typeof events>();
        for (const event of events) {
          if (!event.newValue) continue;
          groups.set(event.newValue, [
            ...(groups.get(event.newValue) ?? []),
            event,
          ]);
        }

        return {
          chartType: config.chartType,
          data: [...groups.entries()]
            .filter(([, group]) => this.withinGroupBounds(group.length, config))
            .map(([name, group]) => ({
              name,
              value: this.aggregateDays(group, config),
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, config.groupLimit ?? DEFAULT_GROUP_LIMIT),
        };
      }

      // A duration has no per-record row shape to tabulate.
      case "TABLE":
        throw new BadRequestException(
          "A time-to-change metric cannot be rendered as a table"
        );
    }
  }

  private async loadDurationEvents(
    rows: { id: string; createdAt: Date }[],
    config: AggregationConfig
  ) {
    if (!config.durationFieldId || rows.length === 0) return [];

    const createdById = new Map(rows.map((row) => [row.id, row.createdAt]));

    // action "update" only: a create writes the first value and would report
    // zero days for every record.
    const history = await prisma.history.findMany({
      where: {
        recordId: { in: [...createdById.keys()] },
        fieldId: config.durationFieldId,
        action: "update",
      },
      select: { recordId: true, newValue: true, createdAt: true },
    });

    return history.flatMap((entry) => {
      const createdAt = createdById.get(entry.recordId);
      if (!createdAt) return [];

      return [
        {
          changedAt: entry.createdAt,
          newValue: entry.newValue,
          days: (entry.createdAt.getTime() - createdAt.getTime()) / 86_400_000,
        },
      ];
    });
  }

  // COUNT counts changes; everything else aggregates the day figures. PERCENT
  // has no numerator to read here, so it is not offered.
  private aggregateDays(
    events: { days: number }[],
    config: { metricAggregation: CustomAnalyticAggregation }
  ): number {
    if (config.metricAggregation === "COUNT") return events.length;
    if (events.length === 0) return 0;

    const days = events.map((event) => event.days);

    const value =
      config.metricAggregation === "SUM"
        ? days.reduce((sum, day) => sum + day, 0)
        : config.metricAggregation === "MIN"
          ? Math.min(...days)
          : config.metricAggregation === "MAX"
            ? Math.max(...days)
            : days.reduce((sum, day) => sum + day, 0) / days.length;

    return Number(value.toFixed(1));
  }

  // Walks BoardRelation to group a module's records by the record on the other
  // side: a referral by the facility it came from, or by that facility's own
  // county. A record with no relation joins no group, which is what the
  // hardcoded top-facility lists did - an unlinked referral cannot be
  // attributed to a source.
  private async groupByRelatedRecord(
    rows: { id: string; values: Record<string, string | null> }[],
    config: {
      metricFieldId: string | null;
      metricAggregation: CustomAnalyticAggregation;
      numeratorFilter: AnalyticFilter;
      groupLimit: number | null;
      minGroupSize: number | null;
      maxGroupSize: number | null;
      relationType: RelationType | null;
      relationDirection: CustomAnalyticRelationDirection;
      relatedFieldId: string | null;
    },
    organizationId: string
  ) {
    if (!config.relationType || rows.length === 0) return [];

    const recordIds = rows.map((row) => row.id);
    const outgoing = config.relationDirection === "OUTGOING";

    // BoardRelation.organizationId is nullable, so the tenant guard is the
    // record on the far side, not the relation row.
    const relatedSelect = {
      select: {
        recordName: true,
        values: {
          where: {
            fieldId: {
              in: config.relatedFieldId ? [config.relatedFieldId] : [],
            },
          },
          select: { value: true },
        },
      },
    };

    const relations = await prisma.boardRelation.findMany({
      where: {
        relationType: config.relationType,
        ...(outgoing
          ? {
              sourceId: { in: recordIds },
              target: { organizationId, isDeleted: false },
            }
          : {
              targetId: { in: recordIds },
              source: { organizationId, isDeleted: false },
            }),
      },
      select: {
        sourceId: true,
        targetId: true,
        source: relatedSelect,
        target: relatedSelect,
      },
    });

    const rowById = new Map(rows.map((row) => [row.id, row]));
    const groups = new Map<string, typeof rows>();

    for (const relation of relations) {
      const row = rowById.get(outgoing ? relation.sourceId : relation.targetId);
      const related = outgoing ? relation.target : relation.source;
      if (!row || !related) continue;

      const key = config.relatedFieldId
        ? related.values[0]?.value
        : related.recordName;
      if (!key) continue;

      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return [...groups.entries()]
      .filter(([, groupRows]) =>
        this.withinGroupBounds(groupRows.length, config)
      )
      .map(([name, groupRows]) => ({
        name,
        value: this.aggregate(
          groupRows,
          config.metricFieldId,
          config.metricAggregation,
          config.numeratorFilter
        ),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, config.groupLimit ?? DEFAULT_GROUP_LIMIT);
  }

  // Bounds are on how many records a group holds, not on its aggregated value:
  // "sources with fewer than five referrals" is a count question.
  private withinGroupBounds(
    size: number,
    config: { minGroupSize: number | null; maxGroupSize: number | null }
  ): boolean {
    if (config.minGroupSize !== null && size < config.minGroupSize)
      return false;
    if (config.maxGroupSize !== null && size > config.maxGroupSize)
      return false;
    return true;
  }

  // COUNT ignores the metric field. Everything else parses Number() and drops
  // null/NaN values instead of coercing them to 0, so a missing value cannot
  // silently drag an AVG down.
  private aggregate(
    rows: AggregationRow[],
    metricFieldId: string | null,
    aggregation: CustomAnalyticAggregation,
    numeratorFilter: AnalyticFilter = EMPTY_FILTER
  ): number {
    if (aggregation === "COUNT") return rows.length;

    // PERCENT is a share of the group, not a value read off a field: the
    // numerator is the rows that also match its own conditions.
    if (aggregation === "PERCENT") {
      if (rows.length === 0) return 0;
      const matched = rows.filter((row) =>
        matchesFilter(numeratorFilter, row.values)
      ).length;
      return Number(((matched / rows.length) * 100).toFixed(2));
    }

    if (!metricFieldId) return 0;

    const numbers = rows
      .filter((row) => row.values[metricFieldId] != null)
      .map((row) => Number(row.values[metricFieldId]))
      .filter((value) => !Number.isNaN(value));

    if (numbers.length === 0) return 0;

    switch (aggregation) {
      case "SUM":
        return numbers.reduce((a, b) => a + b, 0);
      case "AVG":
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
      case "MIN":
        return Math.min(...numbers);
      case "MAX":
        return Math.max(...numbers);
    }
  }
}
