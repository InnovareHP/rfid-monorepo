// A dashboard used to run one full Board scan per chart. Charts reading the
// same module over the same window now share one load, and a chart still only
// sees the fields it reads.
// Runs are cached in Redis; the batching this file measures happens on a miss.
jest.mock("../../lib/redis/redis", () => ({
  cacheData: jest.fn(),
  getData: jest.fn().mockResolvedValue(null),
  purgeAllCacheKeys: jest.fn(),
}));

jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    customAnalyticDashboard: { findFirst: jest.fn() },
    field: { findMany: jest.fn() },
    board: { findMany: jest.fn() },
    // Grouped charts read the field's option colours after aggregating.
    fieldOption: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "../../lib/prisma/prisma";
import { CustomAnalyticsService } from "./custom-analytics.service";

const ORG = "33333333-3333-4333-8333-333333333333";
const LEAD = "44444444-4444-4444-8444-444444444444";
const REFERRAL = "55555555-5555-4555-8555-555555555555";
const STATUS = "66666666-6666-4666-8666-666666666666";
const PAYOR = "77777777-7777-4777-8777-777777777777";

const mocked = prisma as unknown as {
  customAnalyticDashboard: { findFirst: jest.Mock };
  field: { findMany: jest.Mock };
  board: { findMany: jest.Mock };
};

const analytic = (
  id: string,
  moduleId: string,
  overrides: Record<string, unknown> = {}
) => ({
  id,
  name: id,
  moduleId,
  chartType: "PIE",
  metricFieldId: null,
  metricAggregation: "COUNT",
  dimensionType: "FIELD",
  dimensionFieldId: STATUS,
  dateBucket: "DAY",
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
  // getDashboard includes the module so a run can name it; the fixture mirrors
  // that shape rather than the bare row.
  module: { key: moduleId === LEAD ? "LEAD" : "REFERRAL", label: moduleId },
  ...overrides,
});

const boardRow = {
  id: "b1",
  recordName: "Record",
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  assignedTo: null,
  values: [
    { fieldId: STATUS, value: "Open" },
    { fieldId: PAYOR, value: "Medicare" },
  ],
};

describe("runDashboard load batching", () => {
  const service = new CustomAnalyticsService(null as never);

  const runWith = async (analytics: ReturnType<typeof analytic>[]) => {
    mocked.customAnalyticDashboard.findFirst.mockResolvedValue({
      id: "dash",
      name: "Overview",
      analytics,
    });
    mocked.board.findMany.mockResolvedValue([boardRow]);
    mocked.field.findMany.mockResolvedValue([
      { id: STATUS, fieldName: "Status", fieldType: "STATUS" },
    ]);

    return service.runDashboard("dash", ORG);
  };

  beforeEach(() => jest.clearAllMocks());

  it("loads once for charts on the same module and window", async () => {
    const result = await runWith([
      analytic("a", LEAD),
      analytic("b", LEAD, { dimensionFieldId: PAYOR }),
      analytic("c", LEAD, { chartType: "KPI" }),
    ]);

    expect(mocked.board.findMany).toHaveBeenCalledTimes(1);
    expect(result.charts).toHaveLength(3);
  });

  it("asks that one load for the union of the fields the charts read", async () => {
    await runWith([
      analytic("a", LEAD),
      analytic("b", LEAD, { dimensionFieldId: PAYOR }),
    ]);

    const [call] = mocked.board.findMany.mock.calls[0];
    expect(call.select.values.where.fieldId.in.sort()).toEqual(
      [STATUS, PAYOR].sort()
    );
  });

  it("still loads separately per module and per range", async () => {
    await runWith([
      analytic("a", LEAD),
      analytic("b", REFERRAL),
      analytic("c", LEAD, { rangeDays: 30 }),
    ]);

    expect(mocked.board.findMany).toHaveBeenCalledTimes(3);
  });

  it("gives each chart only the fields it reads", async () => {
    const result = await runWith([
      analytic("a", LEAD, { chartType: "TABLE", columnIds: [STATUS] }),
      analytic("b", LEAD, { dimensionFieldId: PAYOR }),
    ]);

    const table = result.charts[0].result;
    if (table.chartType !== "TABLE") throw new Error("expected a TABLE result");

    expect(Object.keys(table.rows[0].values)).toEqual([STATUS]);
  });

  it("produces the same numbers as running each chart alone", async () => {
    const batched = await runWith([
      analytic("a", LEAD),
      analytic("b", LEAD, { dimensionFieldId: PAYOR }),
    ]);

    expect(batched.charts[0].result).toEqual({
      chartType: "PIE",
      data: [{ name: "Open", value: 1 }],
    });
    expect(batched.charts[1].result).toEqual({
      chartType: "PIE",
      data: [{ name: "Medicare", value: 1 }],
    });
  });
});
