// A chart built from inside a dashboard joins it in the same write, so it can
// never end up saved but unattached.
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    module: { findFirst: jest.fn() },
    field: { count: jest.fn() },
    customAnalytic: { create: jest.fn(), findFirst: jest.fn() },
    customAnalyticDashboard: { findFirst: jest.fn() },
  },
}));

import { NotFoundException } from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";
import { CustomAnalyticsService } from "./custom-analytics.service";
import { SaveCustomAnalyticDto } from "./dto/custom-analytics.dto";

const ORG = "33333333-3333-4333-8333-333333333333";
const MODULE = "44444444-4444-4444-8444-444444444444";
const DASHBOARD = "55555555-5555-4555-8555-555555555555";
const USER = "66666666-6666-4666-8666-666666666666";

const mocked = prisma as unknown as {
  module: { findFirst: jest.Mock };
  field: { count: jest.Mock };
  customAnalytic: { create: jest.Mock; findFirst: jest.Mock };
  customAnalyticDashboard: { findFirst: jest.Mock };
};

const dto = (dashboardId: string | null) =>
  ({
    name: "New chart",
    moduleId: MODULE,
    chartType: "BAR",
    metricFieldId: null,
    metricAggregation: "COUNT",
    dimensionType: "FIELD",
    dimensionFieldId: null,
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
    metricSource: "FIELD_VALUE",
    durationFieldId: null,
    marketingMeasure: "INTERACTIONS",
    marketingGroupBy: null,
    dashboardId,
  }) as unknown as SaveCustomAnalyticDto;

describe("creating a chart from inside a dashboard", () => {
  const service = new CustomAnalyticsService(null as never);

  beforeEach(() => {
    jest.clearAllMocks();
    mocked.module.findFirst.mockResolvedValue({ id: MODULE });
    mocked.field.count.mockResolvedValue(0);
    mocked.customAnalytic.create.mockResolvedValue({ id: "new" });
  });

  it("appends after the dashboard's last chart", async () => {
    mocked.customAnalyticDashboard.findFirst.mockResolvedValue({
      id: DASHBOARD,
    });
    mocked.customAnalytic.findFirst.mockResolvedValue({ dashboardOrder: 4 });

    await service.createAnalytic(dto(DASHBOARD), ORG, USER);

    expect(mocked.customAnalytic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dashboardId: DASHBOARD,
          dashboardOrder: 5,
        }),
      })
    );
  });

  it("starts at zero on an empty dashboard", async () => {
    mocked.customAnalyticDashboard.findFirst.mockResolvedValue({
      id: DASHBOARD,
    });
    mocked.customAnalytic.findFirst.mockResolvedValue(null);

    await service.createAnalytic(dto(DASHBOARD), ORG, USER);

    expect(mocked.customAnalytic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dashboardOrder: 0 }),
      })
    );
  });

  it("leaves the chart unattached when no dashboard is named", async () => {
    await service.createAnalytic(dto(null), ORG, USER);

    const [call] = mocked.customAnalytic.create.mock.calls[0];
    expect(call.data.dashboardId).toBeUndefined();
    expect(mocked.customAnalyticDashboard.findFirst).not.toHaveBeenCalled();
  });

  it("refuses a dashboard belonging to another organization", async () => {
    mocked.customAnalyticDashboard.findFirst.mockResolvedValue(null);

    await expect(
      service.createAnalytic(dto(DASHBOARD), ORG, USER)
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mocked.customAnalytic.create).not.toHaveBeenCalled();
  });
});
