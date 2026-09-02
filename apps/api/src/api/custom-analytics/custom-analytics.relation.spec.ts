// Proves the RELATED_RECORD dimension reproduces the hardcoded relation-walk
// lists: getTopFacilities groups referrals by the linked lead's name, and
// getTopCounties groups them by that lead's County value.
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    module: { findFirst: jest.fn() },
    field: { count: jest.fn() },
    board: { findMany: jest.fn() },
    boardRelation: { findMany: jest.fn() },
  },
}));

import { prisma } from "../../lib/prisma/prisma";
import { CustomAnalyticsService } from "./custom-analytics.service";
import { PreviewCustomAnalyticDto } from "./dto/custom-analytics.dto";

const ORG = "33333333-3333-4333-8333-333333333333";
const MODULE = "44444444-4444-4444-8444-444444444444";
const COUNTY_FIELD = "55555555-5555-4555-8555-555555555555";

const mocked = prisma as unknown as {
  module: { findFirst: jest.Mock };
  field: { count: jest.Mock };
  board: { findMany: jest.Mock };
  boardRelation: { findMany: jest.Mock };
};

// Referral id -> the lead it links to, and that lead's county.
const LINKS: { referralId: string; facility: string; county: string | null }[] =
  [
    { referralId: "r1", facility: "Maple Care", county: "Orange" },
    { referralId: "r2", facility: "Maple Care", county: "Orange" },
    { referralId: "r3", facility: "Maple Care", county: "Orange" },
    { referralId: "r4", facility: "Birch Health", county: "Volusia" },
    { referralId: "r5", facility: "Cedar Home", county: null },
  ];

// An unlinked referral exists on the board but joins no group.
const RECORD_IDS = [...LINKS.map((link) => link.referralId), "r6"];

const boardRows = RECORD_IDS.map((id) => ({
  id,
  recordName: id,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  assignedTo: null,
  values: [],
}));

const relationRows = (byField: boolean) =>
  LINKS.map((link) => ({
    sourceId: link.referralId,
    targetId: `lead-${link.facility}`,
    source: { recordName: link.referralId, values: [] },
    target: {
      recordName: link.facility,
      values: byField && link.county ? [{ value: link.county }] : [],
    },
  }));

// analytics.service.ts countByValue, ranked and null-dropped the way
// getTopFacilities and getTopCounties post-process it.
const legacyCount = (values: (string | null)[]) => {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value === null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
};

const dto = (overrides: Record<string, unknown> = {}) =>
  ({
    moduleId: MODULE,
    chartType: "BAR",
    metricFieldId: null,
    metricAggregation: "COUNT",
    dimensionType: "RELATED_RECORD",
    dimensionFieldId: null,
    dateBucket: "DAY",
    columnIds: [],
    filter: { match: "AND", conditions: [] },
    rangeDays: null,
    groupLimit: null,
    numeratorFilter: { match: "AND", conditions: [] },
    minGroupSize: null,
    maxGroupSize: null,
    relationType: "REFERRAL_LINK",
    relationDirection: "OUTGOING",
    relatedFieldId: null,
    ...overrides,
  }) as unknown as PreviewCustomAnalyticDto;

describe("RELATED_RECORD grouping vs the hardcoded relation walks", () => {
  const service = new CustomAnalyticsService(null as never);

  const run = async (byField: boolean, overrides = {}) => {
    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(1);
    mocked.board.findMany.mockResolvedValue(boardRows);
    mocked.boardRelation.findMany.mockResolvedValue(relationRows(byField));

    const result = await service.previewAnalytic(dto(overrides), ORG);
    if (result.chartType !== "BAR") throw new Error("expected a BAR result");
    return result.data;
  };

  beforeEach(() => jest.clearAllMocks());

  it("matches getTopFacilities", async () => {
    expect(await run(false)).toEqual(
      legacyCount(LINKS.map((link) => link.facility))
    );
  });

  it("matches getTopCounties, dropping the lead with no county", async () => {
    const data = await run(true, { relatedFieldId: COUNTY_FIELD });

    expect(data).toEqual(legacyCount(LINKS.map((link) => link.county)));
    expect(data.map((group) => group.name)).not.toContain("Cedar Home");
  });

  it("leaves an unlinked record out of every group", async () => {
    const total = (await run(false)).reduce(
      (sum, group) => sum + group.value,
      0
    );

    expect(total).toBe(LINKS.length);
    expect(total).toBeLessThan(boardRows.length);
  });

  it("scopes the far side of the relation to the organization", async () => {
    await run(false);

    expect(mocked.boardRelation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          relationType: "REFERRAL_LINK",
          target: { organizationId: ORG, isDeleted: false },
        }),
      })
    );
  });

  it("reads the other end when the direction is incoming", async () => {
    await run(false, { relationDirection: "INCOMING" });

    expect(mocked.boardRelation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: { organizationId: ORG, isDeleted: false },
        }),
      })
    );
  });

  // getEmergingSources is exactly this: linked sources below a threshold.
  it("expresses the emerging-sources cut with a max group size", async () => {
    expect(await run(false, { maxGroupSize: 2 })).toEqual([
      { name: "Birch Health", value: 1 },
      { name: "Cedar Home", value: 1 },
    ]);
  });

  it("returns nothing when no relation is configured", async () => {
    expect(await run(false, { relationType: null })).toEqual([]);
  });
});
