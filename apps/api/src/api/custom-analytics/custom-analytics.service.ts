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
  Prisma,
} from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
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
  chartType: "BAR" | "PIE";
  data: { name: string; value: number }[];
};
type LineResult = {
  chartType: "LINE";
  data: { bucket: string; value: number }[];
};
type KpiResult = { chartType: "KPI"; value: number };
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

type AggregationConfig = {
  moduleId: string;
  chartType: CustomAnalyticChartType;
  metricFieldId: string | null;
  metricAggregation: CustomAnalyticAggregation;
  dimensionType: CustomAnalyticDimensionType;
  dimensionFieldId: string | null;
  dateBucket: CustomAnalyticDateBucket;
  columnIds: string[];
  filter: Record<string, string>;
  rangeDays: number | null;
  // An explicit window takes precedence over rangeDays. Only ever set by a
  // run request's query params, never persisted on the saved analytic.
  dateWindow?: DateWindow;
};

// Chart order is only meaningful inside a dashboard; createdAt breaks ties so
// a fresh @default(0) collision can never render non-deterministically.
const DASHBOARD_CHART_ORDER: Prisma.CustomAnalyticOrderByWithRelationInput[] = [
  { dashboardOrder: "asc" },
  { createdAt: "asc" },
];

@Injectable()
export class CustomAnalyticsService {
  // The ids arrive from the client, so ownership is proven here rather than
  // trusted: a foreign module or field would otherwise be stored and quietly
  // resolve to nothing at run time.
  private async assertOwned(
    organizationId: string,
    moduleId: string,
    fieldIds: string[]
  ) {
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
  }) {
    return [
      ...(config.metricFieldId ? [config.metricFieldId] : []),
      ...(config.dimensionType === "FIELD" && config.dimensionFieldId
        ? [config.dimensionFieldId]
        : []),
      ...config.columnIds,
    ];
  }

  async getAnalytics(organizationId: string) {
    return prisma.customAnalytic.findMany({
      where: { organizationId },
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

  async createAnalytic(
    dto: SaveCustomAnalyticDto,
    organizationId: string,
    userId: string
  ) {
    await this.assertOwned(
      organizationId,
      dto.moduleId,
      this.ownedFieldIds(dto)
    );

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
        moduleId: dto.moduleId,
        organizationId,
        createdBy: userId,
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
    const fieldIds = this.ownedFieldIds({
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
    });
    await this.assertOwned(organizationId, moduleId, fieldIds);

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
      },
    });
  }

  async deleteAnalytic(id: string, organizationId: string) {
    await this.getAnalytic(id, organizationId);

    await prisma.customAnalytic.delete({ where: { id } });

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
          select: { id: true, name: true, chartType: true },
        },
      },
    });
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

    if (dto.analyticIds !== undefined) {
      await this.assertAnalyticsOwned(organizationId, dto.analyticIds);
    }

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

      return { id, analyticIds: nextIds };
    });
  }

  async deleteDashboard(id: string, organizationId: string) {
    await this.getDashboard(id, organizationId);

    // DB-level SetNull nulls dashboardId but cannot zero dashboardOrder.
    await prisma.$transaction([
      prisma.customAnalytic.updateMany({
        where: { organizationId, dashboardId: id },
        data: { dashboardId: null, dashboardOrder: 0 },
      }),
      prisma.customAnalyticDashboard.delete({ where: { id } }),
    ]);

    return { message: "Dashboard deleted successfully" };
  }

  async runDashboard(
    id: string,
    organizationId: string,
    dateWindow: DateWindow = null,
    limit: number | null = null
  ) {
    const dashboard = await this.getDashboard(id, organizationId);

    // Each chart is one unbounded Board scan, so the list page asks for only
    // the first. Null means "all", preserving the view page's behaviour.
    const members =
      limit === null
        ? dashboard.analytics
        : dashboard.analytics.slice(0, limit);

    const charts = await Promise.all(
      members.map(async (analytic) => ({
        id: analytic.id,
        name: analytic.name,
        chartType: analytic.chartType,
        result: await this.computeAggregation(
          { ...this.analyticToConfig(analytic), dateWindow },
          organizationId
        ),
      }))
    );

    return {
      id: dashboard.id,
      name: dashboard.name,
      // Total membership, not charts.length - the list card needs "+N more".
      chartCount: dashboard.analytics.length,
      charts,
    };
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
      filter: analytic.filter as Record<string, string>,
      rangeDays: analytic.rangeDays,
    };
  }

  async runAnalytic(
    id: string,
    organizationId: string,
    dateWindow: DateWindow = null
  ) {
    const analytic = await this.getAnalytic(id, organizationId);

    return this.computeAggregation(
      { ...this.analyticToConfig(analytic), dateWindow },
      organizationId
    );
  }

  async previewAnalytic(dto: PreviewCustomAnalyticDto, organizationId: string) {
    await this.assertOwned(
      organizationId,
      dto.moduleId,
      this.ownedFieldIds(dto)
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
        filter: dto.filter,
        rangeDays: dto.rangeDays,
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
  // fieldName, since two fields in the same module can share a name.
  private async computeAggregation(
    config: AggregationConfig,
    organizationId: string
  ): Promise<AggregationResult> {
    const neededFieldIds = this.ownedFieldIds(config);

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
          where: { fieldId: { in: neededFieldIds } },
          select: { fieldId: true, value: true },
        },
      },
    });

    const filterEntries = Object.entries(config.filter).filter(
      ([, value]) => value
    );

    const rows = records
      .map((record) => {
        const byField = new Map(
          record.values.map((value) => [value.fieldId, value.value])
        );
        return {
          id: record.id,
          recordName: record.recordName,
          createdAt: record.createdAt,
          assignedTo: record.assignedTo,
          values: Object.fromEntries(
            neededFieldIds.map((fieldId) => [
              fieldId,
              byField.get(fieldId) ?? null,
            ])
          ),
        };
      })
      .filter((row) =>
        filterEntries.every(
          ([fieldId, expected]) => row.values[fieldId] === expected
        )
      );

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

      case "KPI":
        return {
          chartType: "KPI",
          value: this.aggregate(
            rows,
            config.metricFieldId,
            config.metricAggregation
          ),
        };

      case "BAR":
      case "PIE": {
        if (config.dimensionType === "OWNER") {
          return {
            chartType: config.chartType,
            data: await this.groupByOwner(rows, config),
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
            .map(([name, groupRows]) => ({
              name,
              value: this.aggregate(
                groupRows,
                config.metricFieldId,
                config.metricAggregation
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
          .map(([name, groupRows]) => ({
            name,
            value: this.aggregate(
              groupRows,
              config.metricFieldId,
              config.metricAggregation
            ),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
        return { chartType: config.chartType, data };
      }

      case "LINE": {
        const bucket = config.dateBucket ?? "DAY";
        const groups = new Map<string, typeof rows>();
        for (const row of rows) {
          const key = this.bucketDate(row.createdAt, bucket);
          groups.set(key, [...(groups.get(key) ?? []), row]);
        }
        const data = [...groups.entries()]
          .map(([bucket, groupRows]) => ({
            bucket,
            value: this.aggregate(
              groupRows,
              config.metricFieldId,
              config.metricAggregation
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
      .map(([key, groupRows]) => ({
        name:
          key === UNASSIGNED
            ? "Unassigned"
            : (nameById.get(key) ?? "Unassigned"),
        value: this.aggregate(
          groupRows,
          config.metricFieldId,
          config.metricAggregation
        ),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  // COUNT ignores the metric field. Everything else parses Number() and drops
  // null/NaN values instead of coercing them to 0, so a missing value cannot
  // silently drag an AVG down.
  private aggregate(
    rows: AggregationRow[],
    metricFieldId: string | null,
    aggregation: CustomAnalyticAggregation
  ): number {
    if (aggregation === "COUNT") return rows.length;
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
