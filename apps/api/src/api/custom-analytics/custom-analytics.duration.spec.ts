// Proves the DAYS_TO_CHANGE metric reproduces the hardcoded History metrics:
// getAvgTimeTrend (average days per month) and getAverageTimeByStatus (average
// days per status reached).
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    module: { findFirst: jest.fn() },
    field: { count: jest.fn() },
    board: { findMany: jest.fn() },
    history: { findMany: jest.fn() },
  },
}));

import { prisma } from "../../lib/prisma/prisma";
import { CustomAnalyticsService } from "./custom-analytics.service";
import { PreviewCustomAnalyticDto } from "./dto/custom-analytics.dto";

const ORG = "33333333-3333-4333-8333-333333333333";
const MODULE = "44444444-4444-4444-8444-444444444444";
const STATUS_FIELD = "55555555-5555-4555-8555-555555555555";

const mocked = prisma as unknown as {
  module: { findFirst: jest.Mock };
  field: { count: jest.Mock };
  board: { findMany: jest.Mock };
  history: { findMany: jest.Mock };
};

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const RECORDS = [
  { id: "r1", createdAt: day("2026-01-01") },
  { id: "r2", createdAt: day("2026-01-10") },
  { id: "r3", createdAt: day("2026-02-01") },
];

// Two changes on r1: a record that moved twice contributes two events.
const CHANGES = [
  { recordId: "r1", newValue: "Assessed", createdAt: day("2026-01-03") },
  { recordId: "r1", newValue: "Admitted", createdAt: day("2026-01-11") },
  { recordId: "r2", newValue: "Admitted", createdAt: day("2026-01-20") },
  { recordId: "r3", newValue: "Rejected", createdAt: day("2026-02-05") },
];

const boardRows = RECORDS.map((record) => ({
  ...record,
  recordName: record.id,
  assignedTo: null,
  values: [],
}));

const daysBetween = (from: Date, to: Date) =>
  (to.getTime() - from.getTime()) / 86_400_000;

const createdById = new Map(RECORDS.map((r) => [r.id, r.createdAt]));

// analytics.service.ts getAvgTimeTrend: month of the change, average days.
const legacyAvgTimeTrend = () => {
  const monthly = new Map<string, number[]>();
  for (const change of CHANGES) {
    const month = change.createdAt.toISOString().slice(0, 7);
    const days = daysBetween(
      createdById.get(change.recordId)!,
      change.createdAt
    );
    monthly.set(month, [...(monthly.get(month) ?? []), days]);
  }
  return [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, days]) => ({
      bucket: month,
      value: Number(
        (days.reduce((sum, d) => sum + d, 0) / days.length).toFixed(1)
      ),
    }));
};

// getAverageTimeByStatus: grouped by the status reached, average days.
const legacyAvgTimeByStatus = () => {
  const byStatus = new Map<string, number[]>();
  for (const change of CHANGES) {
    const days = daysBetween(
      createdById.get(change.recordId)!,
      change.createdAt
    );
    byStatus.set(change.newValue, [
      ...(byStatus.get(change.newValue) ?? []),
      days,
    ]);
  }
  return [...byStatus.entries()]
    .map(([name, days]) => ({
      name,
      value: Number(
        (days.reduce((sum, d) => sum + d, 0) / days.length).toFixed(1)
      ),
    }))
    .sort((a, b) => b.value - a.value);
};

const dto = (overrides: Record<string, unknown> = {}) =>
  ({
    moduleId: MODULE,
    chartType: "BAR",
    metricFieldId: null,
    metricAggregation: "AVG",
    dimensionType: "FIELD",
    dimensionFieldId: null,
    dateBucket: "MONTH",
    columnIds: [],
    filter: { match: "AND", conditions: [] },
    rangeDays: null,
    groupLimit: null,
    numeratorFilter: { match: "AND", conditions: [] },
    minGroupSize: null,
    maxGroupSize: null,
    relationType: null,
    relationDirection: "OUTGOING",
    relatedFieldId: null,
    metricSource: "DAYS_TO_CHANGE",
    durationFieldId: STATUS_FIELD,
    ...overrides,
  }) as unknown as PreviewCustomAnalyticDto;

describe("DAYS_TO_CHANGE vs the hardcoded History metrics", () => {
  const service = new CustomAnalyticsService(null as never);

  const run = async (overrides = {}) => {
    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(1);
    mocked.board.findMany.mockResolvedValue(boardRows);
    mocked.history.findMany.mockResolvedValue(CHANGES);

    return service.previewAnalytic(dto(overrides), ORG);
  };

  beforeEach(() => jest.clearAllMocks());

  it("matches getAvgTimeTrend", async () => {
    const result = await run({ chartType: "LINE" });
    if (result.chartType !== "LINE") throw new Error("expected a LINE result");

    expect(result.data).toEqual(legacyAvgTimeTrend());
  });

  it("matches getAverageTimeByStatus", async () => {
    const result = await run();
    if (result.chartType !== "BAR") throw new Error("expected a BAR result");

    expect(result.data).toEqual(legacyAvgTimeByStatus());
  });

  it("reads update rows on the tracked field only", async () => {
    await run();

    expect(mocked.history.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fieldId: STATUS_FIELD,
          action: "update",
        }),
      })
    );
  });

  it("counts changes rather than days under COUNT", async () => {
    const result = await run({ metricAggregation: "COUNT", chartType: "KPI" });
    if (result.chartType !== "KPI") throw new Error("expected a KPI result");

    expect(result.value).toBe(CHANGES.length);
  });

  it("reports zero for a board with no changes", async () => {
    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(1);
    mocked.board.findMany.mockResolvedValue(boardRows);
    mocked.history.findMany.mockResolvedValue([]);

    const result = await service.previewAnalytic(
      dto({ chartType: "KPI" }),
      ORG
    );
    if (result.chartType !== "KPI") throw new Error("expected a KPI result");

    expect(result.value).toBe(0);
  });

  it("skips History entirely when no field is tracked", async () => {
    const result = await run({ durationFieldId: null, chartType: "KPI" });
    if (result.chartType !== "KPI") throw new Error("expected a KPI result");

    expect(mocked.history.findMany).not.toHaveBeenCalled();
    expect(result.value).toBe(0);
  });
});
