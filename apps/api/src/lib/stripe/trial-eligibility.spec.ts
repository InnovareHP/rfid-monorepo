const findMany = jest.fn();
const count = jest.fn();
jest.mock("../prisma/prisma", () => ({
  prisma: {
    member: { findMany: (...a: unknown[]) => findMany(...a) },
    subscription: { count: (...a: unknown[]) => count(...a) },
  },
}));

import { hasConsumedFreeTrial } from "./trial-eligibility";

beforeEach(() => {
  findMany.mockReset();
  count.mockReset();
});

// The Stripe plugin asks whether this organization trialled. This asks whether
// the person did, which is the question a second organization makes relevant.
describe("hasConsumedFreeTrial", () => {
  it("is false for an owner of nothing, without querying subscriptions", async () => {
    findMany.mockResolvedValue([]);
    await expect(hasConsumedFreeTrial("user-1")).resolves.toBe(false);
    expect(count).not.toHaveBeenCalled();
  });

  it("is false when no organization this owner holds ever trialled", async () => {
    findMany.mockResolvedValue([{ organizationId: "org-1" }]);
    count.mockResolvedValue(0);
    await expect(hasConsumedFreeTrial("user-1")).resolves.toBe(false);
  });

  it("is true once one of them has", async () => {
    findMany.mockResolvedValue([
      { organizationId: "org-1" },
      { organizationId: "org-2" },
    ]);
    count.mockResolvedValue(1);
    await expect(hasConsumedFreeTrial("user-1")).resolves.toBe(true);
  });

  // A trial that ended still counts, so the match is on trialStart existing
  // rather than on the subscription sitting in trialing right now.
  it("counts a finished trial and a running one", async () => {
    findMany.mockResolvedValue([{ organizationId: "org-1" }]);
    count.mockResolvedValue(0);
    await hasConsumedFreeTrial("user-1");
    expect(count).toHaveBeenCalledWith({
      where: {
        referenceId: { in: ["org-1"] },
        OR: [{ trialStart: { not: null } }, { status: "trialing" }],
      },
    });
  });
});
