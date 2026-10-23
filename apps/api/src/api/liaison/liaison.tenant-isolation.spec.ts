import { NotFoundException } from "@nestjs/common";

// The service imports the prisma singleton directly, so the module is mocked
// and each delegate call is captured for inspection.
jest.mock("../../lib/prisma/prisma", () => {
  const delegate = () => ({
    findFirst: jest.fn().mockResolvedValue(null),
    findUniqueOrThrow: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  });

  const prisma = {
    mileage: delegate(),
    marketing: delegate(),
    expense: delegate(),
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  return { prisma };
});

import { prisma } from "../../lib/prisma/prisma";
import { LiaisonService } from "./liaison.service";

const ORG = "org-a";
const OTHER_ORG_ROW = "row-owned-by-org-b";

type MockedDelegate = {
  findFirst: jest.Mock;
  findUniqueOrThrow: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  updateMany: jest.Mock;
  deleteMany: jest.Mock;
};

const delegates = prisma as unknown as {
  mileage: MockedDelegate;
  marketing: MockedDelegate;
  expense: MockedDelegate;
};

// All three carry their own organizationId. Scoping through the member relation
// instead would drop every row whose liaison has since been removed, because
// that membership is set null rather than kept.
function expectsOrgScope(where: unknown) {
  expect(where).toMatchObject({ organizationId: ORG });
}

describe("LiaisonService tenant isolation", () => {
  let service: LiaisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const d of [
      delegates.mileage,
      delegates.marketing,
      delegates.expense,
    ]) {
      d.findFirst.mockResolvedValue(null);
      d.updateMany.mockResolvedValue({ count: 0 });
      d.deleteMany.mockResolvedValue({ count: 0 });
    }
    service = new LiaisonService();
  });

  describe.each([
    [
      "mileage",
      "getMillageById",
      "updateMillage",
      "deleteMillage",
      "bulkDeleteMillage",
    ],
    [
      "marketing",
      "getMarketingById",
      "updateMarketing",
      "deleteMarketing",
      "bulkDeleteMarketing",
    ],
    ["expense", null, "updateExpense", "deleteExpense", "bulkDeleteExpense"],
  ] as const)("%s", (model, getter, updater, deleter, bulkDeleter) => {
    const delegate = () => delegates[model];

    if (getter) {
      it(`${getter} refuses a row belonging to another organization`, async () => {
        await expect(
          (service as any)[getter](OTHER_ORG_ROW, ORG)
        ).rejects.toThrow(NotFoundException);

        expect(delegate().findFirst).toHaveBeenCalled();
        expectsOrgScope(delegate().findFirst.mock.calls[0][0].where);
      });
    }

    it(`${updater} refuses a row belonging to another organization`, async () => {
      await expect(
        (service as any)[updater](OTHER_ORG_ROW, {}, ORG)
      ).rejects.toThrow(NotFoundException);

      expectsOrgScope(delegate().findFirst.mock.calls[0][0].where);
      expect(delegate().update).not.toHaveBeenCalled();
    });

    it(`${deleter} refuses a row belonging to another organization`, async () => {
      await expect(
        (service as any)[deleter](OTHER_ORG_ROW, ORG)
      ).rejects.toThrow(NotFoundException);

      expectsOrgScope(delegate().findFirst.mock.calls[0][0].where);
      expect(delegate().update).not.toHaveBeenCalled();
      expect(delegate().delete).not.toHaveBeenCalled();
    });

    it(`${deleter} proceeds once the row is confirmed to be in the organization`, async () => {
      delegate().findFirst.mockResolvedValue({ id: OTHER_ORG_ROW });

      await (service as any)[deleter](OTHER_ORG_ROW, ORG, null);

      const mutated =
        delegate().delete.mock.calls.length > 0
          ? delegate().delete
          : delegate().update;
      expect(mutated).toHaveBeenCalled();
    });

    // Org scope alone let any member edit a colleague's entry, so ordinary
    // members are narrowed to their own rows and admins pass null.
    it(`${updater} narrows to the acting member when one is given`, async () => {
      await expect(
        (service as any)[updater](OTHER_ORG_ROW, {}, ORG, "member-1")
      ).rejects.toThrow(NotFoundException);

      expect(delegate().findFirst.mock.calls[0][0].where).toMatchObject({
        organizationId: ORG,
        memberId: "member-1",
      });
    });

    it(`${deleter} leaves the scope org-wide for an admin`, async () => {
      delegate().findFirst.mockResolvedValue({ id: OTHER_ORG_ROW });

      await (service as any)[deleter](OTHER_ORG_ROW, ORG, null);

      expect(
        delegate().findFirst.mock.calls[0][0].where.memberId
      ).toBeUndefined();
    });

    const bulkMutation = () =>
      model === "marketing" ? delegate().deleteMany : delegate().updateMany;

    it(`${bulkDeleter} rejects a batch holding a row from another organization`, async () => {
      bulkMutation().mockResolvedValue({ count: 1 });

      await expect(
        (service as any)[bulkDeleter](["own-row", OTHER_ORG_ROW], ORG, null)
      ).rejects.toThrow(NotFoundException);

      expectsOrgScope(bulkMutation().mock.calls[0][0].where);
    });

    it(`${bulkDeleter} narrows to the acting member and dedupes ids`, async () => {
      bulkMutation().mockResolvedValue({ count: 1 });

      await (service as any)[bulkDeleter](["row-1", "row-1"], ORG, "member-1");

      expect(bulkMutation().mock.calls[0][0].where).toMatchObject({
        id: { in: ["row-1"] },
        organizationId: ORG,
        memberId: "member-1",
      });
    });
  });
});
