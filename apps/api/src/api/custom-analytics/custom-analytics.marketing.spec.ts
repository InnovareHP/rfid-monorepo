// Proves the MARKETING_ACTIVITY source reproduces the hardcoded liaison
// overview: total facilities and active partners are distinct counts, total
// interactions is a row count, and a log with several touchpoints lands in
// each of them.
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    module: { findFirst: jest.fn() },
    field: { count: jest.fn() },
    board: { findMany: jest.fn() },
    marketing: { findMany: jest.fn() },
  },
}));

import { prisma } from "../../lib/prisma/prisma";
import { CustomAnalyticsService } from "./custom-analytics.service";
import { PreviewCustomAnalyticDto } from "./dto/custom-analytics.dto";

const ORG = "33333333-3333-4333-8333-333333333333";
const MODULE = "44444444-4444-4444-8444-444444444444";

const mocked = prisma as unknown as {
  module: { findFirst: jest.Mock };
  field: { count: jest.Mock };
  board: { findMany: jest.Mock };
  marketing: { findMany: jest.Mock };
};

const log = (
  liaison: string,
  facility: string,
  talkedTo: string,
  touchpoints: string[]
) => ({
  facility,
  talkedTo,
  touchpoints,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  member: { user: { name: liaison } },
});

// Ana visits two facilities, one of them twice; Ben visits one Ana also did.
const LOGS = [
  log("Ana", "Maple Care", "Dr. Reed", ["VISIT"]),
  log("Ana", "Maple Care", "Dr. Reed", ["CALL", "EMAIL"]),
  log("Ana", "Birch Health", "Dr. Osei", ["VISIT"]),
  log("Ben", "Maple Care", "Dr. Reed", ["CALL"]),
];

const dto = (overrides: Record<string, unknown> = {}) =>
  ({
    moduleId: MODULE,
    chartType: "KPI",
    metricFieldId: null,
    metricAggregation: "COUNT",
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
    metricSource: "MARKETING_ACTIVITY",
    durationFieldId: null,
    marketingMeasure: "INTERACTIONS",
    marketingGroupBy: null,
    ...overrides,
  }) as unknown as PreviewCustomAnalyticDto;

describe("MARKETING_ACTIVITY vs the hardcoded liaison overview", () => {
  const service = new CustomAnalyticsService(null as never);

  const run = async (overrides = {}) => {
    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(1);
    mocked.marketing.findMany.mockResolvedValue(LOGS);

    return service.previewAnalytic(dto(overrides), ORG);
  };

  const kpi = async (overrides = {}) => {
    const result = await run(overrides);
    if (result.chartType !== "KPI") throw new Error("expected a KPI result");
    return result.value;
  };

  const grouped = async (overrides = {}) => {
    const result = await run({ chartType: "BAR", ...overrides });
    if (result.chartType !== "BAR") throw new Error("expected a BAR result");
    return result.data;
  };

  beforeEach(() => jest.clearAllMocks());

  it("counts total interactions as one per outreach log", async () => {
    expect(await kpi({ marketingMeasure: "INTERACTIONS" })).toBe(LOGS.length);
  });

  it("counts total facilities distinctly, the way facilitiesCovered did", async () => {
    expect(await kpi({ marketingMeasure: "FACILITIES" })).toBe(2);
  });

  it("counts active partners distinctly, the way peopleContacted did", async () => {
    expect(await kpi({ marketingMeasure: "PEOPLE" })).toBe(2);
  });

  it("never reads the board for an outreach chart", async () => {
    await kpi();

    expect(mocked.board.findMany).not.toHaveBeenCalled();
  });

  it("scopes the logs to the organization and skips deleted ones", async () => {
    await kpi();

    expect(mocked.marketing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG,
          isDeleted: false,
        }),
      })
    );
  });

  it("groups interactions per liaison", async () => {
    expect(await grouped({ marketingGroupBy: "LIAISON" })).toEqual([
      { name: "Ana", value: 3 },
      { name: "Ben", value: 1 },
    ]);
  });

  it("groups distinct facilities per liaison", async () => {
    expect(
      await grouped({
        marketingGroupBy: "LIAISON",
        marketingMeasure: "FACILITIES",
      })
    ).toEqual([
      { name: "Ana", value: 2 },
      { name: "Ben", value: 1 },
    ]);
  });

  // A log carries several touchpoints and the hardcoded tally counted it once
  // per touchpoint, so the totals here exceed the log count on purpose.
  // Sorted by name here, not by value: VISIT and CALL tie, and the tie falls to
  // insertion order, which is a property of the fixture rather than of grouping.
  it("counts a log once per touchpoint it used", async () => {
    const data = await grouped({ marketingGroupBy: "TOUCHPOINT" });

    expect([...data].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      { name: "CALL", value: 2 },
      { name: "EMAIL", value: 1 },
      { name: "VISIT", value: 2 },
    ]);
  });

  it("ranks facilities by how often they were visited", async () => {
    expect(await grouped({ marketingGroupBy: "FACILITY" })).toEqual([
      { name: "Maple Care", value: 3 },
      { name: "Birch Health", value: 1 },
    ]);
  });

  it("buckets an outreach trend by month", async () => {
    const result = await run({ chartType: "LINE" });
    if (result.chartType !== "LINE") throw new Error("expected a LINE result");

    expect(result.data).toEqual([{ bucket: "2026-03", value: 4 }]);
  });

  it("refuses to render outreach as a table", async () => {
    await expect(run({ chartType: "TABLE" })).rejects.toThrow(
      "An outreach metric cannot be rendered as a table"
    );
  });
});
