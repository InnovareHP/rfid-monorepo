// Proves the seeded generic charts return what the hardcoded analytics service
// returns for the same records, and pins the two places they differ.
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    module: { findFirst: jest.fn() },
    field: { count: jest.fn(), findMany: jest.fn() },
    board: { findMany: jest.fn() },
    // Grouped charts read the field's option colours after aggregating.
    fieldOption: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "../../lib/prisma/prisma";
import { CustomAnalyticsService } from "./custom-analytics.service";
import { PreviewCustomAnalyticDto } from "./dto/custom-analytics.dto";

const ORG = "org-a";
// Real ids, because a condition's fieldId is validated as a uuid: a stub id
// makes parseFilter reject the filter and quietly match every row.
const MODULE = "33333333-3333-4333-8333-333333333333";
const STATUS_FIELD = "44444444-4444-4444-8444-444444444444";

const mocked = prisma as unknown as {
  module: { findFirst: jest.Mock };
  field: { count: jest.Mock; findMany: jest.Mock };
  board: { findMany: jest.Mock };
};

type Fixture = { id: string; status: string | null };

// The statuses a referral board actually carries, deliberately uneven so a
// count difference cannot pass by coincidence.
const FIXTURE: Fixture[] = [
  { id: "r1", status: "Admitted" },
  { id: "r2", status: "Admitted" },
  { id: "r3", status: "Admitted" },
  { id: "r4", status: "Pending" },
  { id: "r5", status: "Pending" },
  { id: "r6", status: "Rejected" },
];

const manyStatuses = (count: number): Fixture[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `many-${index}`,
    status: `Status ${index}`,
  }));

const asBoardRows = (fixture: Fixture[]) =>
  fixture.map((row, index) => ({
    id: row.id,
    recordName: `Record ${index}`,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    assignedTo: null,
    values:
      row.status === null ? [] : [{ fieldId: STATUS_FIELD, value: row.status }],
  }));

// analytics.service.ts countByValue, over the FieldValue rows the legacy query
// returns — records with no value for the field produce no row at all.
const legacyCountByValue = (fixture: Fixture[]) => {
  const rows = fixture
    .filter((row) => row.status !== null)
    .map((row) => ({ value: row.status }));

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.value ?? "", (counts.get(row.value ?? "") ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ name: value, value: count }));
};

type DtoOverrides = Partial<{
  chartType: string;
  groupLimit: number | null;
  metricAggregation: string;
  numeratorFilter: unknown;
  minGroupSize: number | null;
  maxGroupSize: number | null;
}>;

const dto = (overrides: DtoOverrides = {}): PreviewCustomAnalyticDto =>
  ({
    moduleId: MODULE,
    chartType: "PIE",
    metricFieldId: null,
    metricAggregation: "COUNT",
    dimensionType: "FIELD",
    dimensionFieldId: STATUS_FIELD,
    dateBucket: "DAY",
    columnIds: [],
    filter: {},
    rangeDays: null,
    groupLimit: null,
    numeratorFilter: { match: "AND", conditions: [] },
    minGroupSize: null,
    maxGroupSize: null,
    ...overrides,
  }) as unknown as PreviewCustomAnalyticDto;

describe("seeded breakdown vs hardcoded analytics", () => {
  const service = new CustomAnalyticsService(null as never);

  const run = async (fixture: Fixture[], overrides: DtoOverrides = {}) => {
    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(1);
    mocked.board.findMany.mockResolvedValue(asBoardRows(fixture));

    const result = await service.previewAnalytic(dto(overrides), ORG);
    if (result.chartType !== "PIE") throw new Error("expected a PIE result");
    return result.data;
  };

  beforeEach(() => jest.clearAllMocks());

  it("matches the legacy status breakdown record for record", async () => {
    expect(await run(FIXTURE)).toEqual(legacyCountByValue(FIXTURE));
  });

  it("scopes the query to the module, the org and live records", async () => {
    await run(FIXTURE);

    expect(mocked.board.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG,
          moduleId: MODULE,
          isDeleted: false,
        }),
      })
    );
  });

  // Divergence 1: the legacy query counts FieldValue rows, so a record that
  // never got a status is invisible to it. The generic engine counts records,
  // so the same board gains an Unknown slice and the slices total the record
  // count. Intended, and the reason a seeded chart can read higher.
  it("counts records with no value as Unknown, unlike the legacy query", async () => {
    const withBlanks: Fixture[] = [...FIXTURE, { id: "r7", status: null }];

    const generic = await run(withBlanks);
    const legacy = legacyCountByValue(withBlanks);

    expect(legacy).not.toContainEqual({ name: "Unknown", value: 1 });
    expect(generic).toContainEqual({ name: "Unknown", value: 1 });
    expect(generic.reduce((sum, slice) => sum + slice.value, 0)).toBe(
      withBlanks.length
    );
  });

  // Divergence 2: BAR and PIE field grouping ranks and truncates, while
  // getStatusBreakdown returns every status. groupLimit sets where the cut
  // falls; an analytic that does not set one keeps the previous fixed ten.
  it("truncates to ten groups by default where the legacy breakdown returns all", async () => {
    const many = manyStatuses(13);

    expect(legacyCountByValue(many)).toHaveLength(13);
    expect(await run(many)).toHaveLength(10);
  });

  it("honours a configured group limit", async () => {
    expect(await run(manyStatuses(13), { groupLimit: 5 })).toHaveLength(5);
    expect(await run(manyStatuses(13), { groupLimit: 50 })).toHaveLength(13);
  });

  it("keeps the highest counts when it truncates", async () => {
    const skewed: Fixture[] = [
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `big-${index}`,
        status: "Busy",
      })),
      { id: "small-1", status: "Rare" },
      { id: "small-2", status: "Rarer" },
    ];

    expect(await run(skewed, { groupLimit: 1 })).toEqual([
      { name: "Busy", value: 5 },
    ]);
  });

  // getConversionRate is admitted over total, as a percentage. A KPI with
  // PERCENT counts the rows that also match the numerator, so the same board
  // produces the same number without a hardcoded status name in the service.
  it("computes a conversion rate the way the legacy metric does", async () => {
    const admitted = FIXTURE.filter((row) => row.status === "Admitted").length;
    const legacyRate = Number(((admitted / FIXTURE.length) * 100).toFixed(2));

    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(1);
    mocked.board.findMany.mockResolvedValue(asBoardRows(FIXTURE));

    const result = await service.previewAnalytic(
      dto({
        chartType: "KPI",
        metricAggregation: "PERCENT",
        numeratorFilter: {
          match: "AND",
          conditions: [
            { fieldId: STATUS_FIELD, operator: "eq", value: "Admitted" },
          ],
        },
      }),
      ORG
    );

    if (result.chartType !== "KPI") throw new Error("expected a KPI result");

    expect(legacyRate).toBe(50);
    expect(result.value).toBe(legacyRate);
  });

  it("reports a zero rate for an empty board rather than dividing by zero", async () => {
    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(1);
    mocked.board.findMany.mockResolvedValue([]);

    const result = await service.previewAnalytic(
      dto({
        chartType: "KPI",
        metricAggregation: "PERCENT",
        numeratorFilter: {
          match: "AND",
          conditions: [
            { fieldId: STATUS_FIELD, operator: "eq", value: "Admitted" },
          ],
        },
      }),
      ORG
    );

    if (result.chartType !== "KPI") throw new Error("expected a KPI result");
    expect(result.value).toBe(0);
  });

  it("drops groups outside the configured size bounds", async () => {
    const skewed: Fixture[] = [
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `big-${index}`,
        status: "Busy",
      })),
      { id: "small-1", status: "Rare" },
      { id: "small-2", status: "Rare" },
      { id: "tiny-1", status: "Tiny" },
    ];

    expect(await run(skewed, { minGroupSize: 2 })).toEqual([
      { name: "Busy", value: 6 },
      { name: "Rare", value: 2 },
    ]);

    // The emerging-sources shape: only groups below the threshold.
    expect(await run(skewed, { maxGroupSize: 2 })).toEqual([
      { name: "Rare", value: 2 },
      { name: "Tiny", value: 1 },
    ]);
  });
});
