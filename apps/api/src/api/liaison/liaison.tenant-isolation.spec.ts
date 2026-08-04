import { NotFoundException } from "@nestjs/common";

// The service imports the prisma singleton directly, so the module is mocked
// and each delegate call is captured for inspection.
jest.mock("../../lib/prisma/prisma", () => {
  const delegate = () => ({
    findFirst: jest.fn().mockResolvedValue(null),
    findUniqueOrThrow: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  });

  return {
    prisma: {
      mileage: delegate(),
      marketing: delegate(),
      expense: delegate(),
    },
  };
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
};

const delegates = prisma as unknown as {
  mileage: MockedDelegate;
  marketing: MockedDelegate;
  expense: MockedDelegate;
};

// These models carry no organizationId column; they scope through the member
// relation, which is the pattern the list queries already use.
function expectsOrgScope(where: unknown) {
  expect(where).toMatchObject({ member: { organizationId: ORG } });
}

describe("LiaisonService tenant isolation", () => {
  let service: LiaisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const d of Object.values(delegates)) {
      d.findFirst.mockResolvedValue(null);
    }
    service = new LiaisonService();
  });

  describe.each([
    ["mileage", "getMillageById", "updateMillage", "deleteMillage"],
    ["marketing", "getMarketingById", "updateMarketing", "deleteMarketing"],
    ["expense", null, "updateExpense", "deleteExpense"],
  ] as const)("%s", (model, getter, updater, deleter) => {
    const delegate = () => delegates[model as keyof typeof delegates];

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

      await (service as any)[deleter](OTHER_ORG_ROW, ORG);

      const mutated =
        delegate().delete.mock.calls.length > 0
          ? delegate().delete
          : delegate().update;
      expect(mutated).toHaveBeenCalled();
    });
  });
});
