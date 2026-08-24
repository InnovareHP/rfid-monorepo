import { BadRequestException, NotFoundException } from "@nestjs/common";

// The service imports the prisma singleton directly, so the module is mocked
// and the interactive transaction is run against the same mocked delegates.
jest.mock("../../lib/prisma/prisma", () => {
  const client = {
    customAnalyticDashboard: { findFirst: jest.fn() },
    customAnalytic: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    $transaction: jest.fn(),
  };

  client.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(client)
  );

  return { prisma: client };
});

import { prisma } from "../../lib/prisma/prisma";
import { CustomAnalyticsService } from "./custom-analytics.service";
import { ReorderDashboardChartsSchema } from "./dto/custom-analytic-dashboard.schema";
import { ReorderDashboardChartsDto } from "./dto/custom-analytic-dashboard.dto";

const ORG = "org-a";
const DASHBOARD = "dashboard-1";

const mocked = prisma as unknown as {
  customAnalyticDashboard: { findFirst: jest.Mock };
  customAnalytic: { updateMany: jest.Mock };
};

// The DTO is a plain shape at runtime, so a literal stands in for it.
const dto = (analyticIds: string[]) =>
  ({ analyticIds }) as ReorderDashboardChartsDto;

function membership(ids: string[]) {
  mocked.customAnalyticDashboard.findFirst.mockResolvedValue({
    id: DASHBOARD,
    analytics: ids.map((id) => ({ id })),
  });
}

describe("CustomAnalyticsService.reorderDashboardCharts", () => {
  let service: CustomAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mocked.customAnalytic.updateMany.mockResolvedValue({ count: 1 });
    service = new CustomAnalyticsService();
  });

  it("writes a dense 0..N-1 order, org- and dashboard-scoped on every write", async () => {
    membership(["a", "b", "c"]);

    const result = await service.reorderDashboardCharts(
      DASHBOARD,
      dto(["c", "a", "b"]),
      ORG
    );

    expect(result).toEqual({ id: DASHBOARD, analyticIds: ["c", "a", "b"] });
    expect(mocked.customAnalytic.updateMany).toHaveBeenCalledTimes(3);

    ["c", "a", "b"].forEach((id, index) => {
      expect(mocked.customAnalytic.updateMany).toHaveBeenNthCalledWith(
        index + 1,
        {
          where: { id, organizationId: ORG, dashboardId: DASHBOARD },
          data: { dashboardOrder: index },
        }
      );
    });
  });

  it("reads membership scoped to the organization", async () => {
    membership(["a"]);

    await service.reorderDashboardCharts(DASHBOARD, dto(["a"]), ORG);

    expect(mocked.customAnalyticDashboard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DASHBOARD, organizationId: ORG },
      })
    );
  });

  it("throws NotFound for a dashboard belonging to another organization", async () => {
    mocked.customAnalyticDashboard.findFirst.mockResolvedValue(null);

    await expect(
      service.reorderDashboardCharts(DASHBOARD, dto(["a"]), ORG)
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mocked.customAnalytic.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an id that is not a member of this dashboard", async () => {
    membership(["a", "b"]);

    await expect(
      service.reorderDashboardCharts(DASHBOARD, dto(["a", "foreign"]), ORG)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mocked.customAnalytic.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a partial array that omits a current member", async () => {
    membership(["a", "b", "c"]);

    await expect(
      service.reorderDashboardCharts(DASHBOARD, dto(["a", "b"]), ORG)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mocked.customAnalytic.updateMany).not.toHaveBeenCalled();
  });

  it("rejects duplicate ids at the schema boundary", () => {
    // Duplicates never reach the service; without this the length-vs-set-size
    // check in the service would not be a sound set-equality test.
    expect(
      ReorderDashboardChartsSchema.safeParse({
        analyticIds: [
          "11111111-1111-4111-8111-111111111111",
          "11111111-1111-4111-8111-111111111111",
        ],
      }).success
    ).toBe(false);

    expect(
      ReorderDashboardChartsSchema.safeParse({ analyticIds: [] }).success
    ).toBe(false);
  });
});
