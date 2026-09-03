jest.mock("../prisma/prisma", () => ({
  prisma: {
    organization: { findUnique: jest.fn() },
    subscription: { findFirst: jest.fn() },
  },
}));

import { requiresWorkEmail } from "./work-email-policy";
import { prisma } from "../prisma/prisma";

const db = prisma as unknown as {
  organization: { findUnique: jest.Mock };
  subscription: { findFirst: jest.Mock };
};

const setup = (
  hipaaEnabled: boolean,
  subscription: Record<string, unknown> | null
) => {
  db.organization.findUnique.mockResolvedValue({ hipaaEnabled });
  db.subscription.findFirst.mockResolvedValue(subscription);
};

beforeEach(() => {
  jest.clearAllMocks();
});

// The plan is what decides. HIPAA mode is a switch an owner can flip at any
// moment, and by then the personal mailbox is already a member.
describe("requiresWorkEmail", () => {
  it("requires it on a scale plan with HIPAA mode still off", async () => {
    setup(false, { plan: "scale", seats: 20, isCustom: false });

    await expect(requiresWorkEmail("org-1")).resolves.toBe(true);
  });

  it("requires it once HIPAA mode is on, whatever the plan", async () => {
    setup(true, { plan: "essentials", seats: 5, isCustom: false });

    await expect(requiresWorkEmail("org-1")).resolves.toBe(true);
  });

  it("requires it on a contract that grants hipaa", async () => {
    setup(false, {
      plan: "essentials",
      seats: 40,
      isCustom: true,
      contractLabel: "Regional health system",
      // A Json column, so Prisma hands back an object rather than a string.
      customLimits: { seats: 40, features: ["hipaa"] },
    });

    await expect(requiresWorkEmail("org-1")).resolves.toBe(true);
  });

  it.each([["growth"], ["essentials"]])(
    "leaves a %s organization free to use any address",
    async (plan) => {
      setup(false, { plan, seats: 10, isCustom: false });

      await expect(requiresWorkEmail("org-1")).resolves.toBe(false);
    }
  );

  it("leaves an organization with no subscription alone", async () => {
    setup(false, null);

    await expect(requiresWorkEmail("org-1")).resolves.toBe(false);
  });
});
