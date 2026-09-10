import { prisma } from "../prisma/prisma";

// The Stripe plugin only checks whether this organization already trialled, so
// a second organization owned by the same person gets a second free trial.
// This closes that by asking about the person instead of the organization.
export const hasConsumedFreeTrial = async (userId: string) => {
  const owned = await prisma.member.findMany({
    where: { userId, role: "owner" },
    select: { organizationId: true },
  });
  if (owned.length === 0) return false;

  const trialled = await prisma.subscription.count({
    where: {
      referenceId: { in: owned.map((member) => member.organizationId) },
      OR: [{ trialStart: { not: null } }, { status: "trialing" }],
    },
  });

  return trialled > 0;
};
