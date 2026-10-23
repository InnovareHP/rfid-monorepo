import { prisma } from "../prisma/prisma";

// A trial is granted per organization, so an owner spinning up organizations is
// the free trial abuse path. Three covers a genuine multi location customer
// evaluating the product; past that the account has to buy something first.
const MAX_UNPAID_ORGANIZATIONS_PER_OWNER = 3;

export const ORGANIZATION_LIMIT_MESSAGE =
  "You already own the maximum number of organizations on a free trial. Subscribe on one of them, or contact support to add another.";

// A predicate rather than a guard because throwing needs better-auth/api, which
// is ESM only and cannot be loaded by the CJS test runner. Same cut as
// work-email-policy.ts; the caller in auth-helper.ts raises the APIError.
//
// Better Auth's own organizationLimit option counts memberships, so being
// invited into other organizations would burn the allowance. Ownership is the
// only count that tracks who took the trials.
export const hasExhaustedFreeOrganizations = async (userId: string) => {
  const owned = await prisma.member.findMany({
    where: { userId, role: "owner" },
    select: { organizationId: true },
  });
  if (owned.length < MAX_UNPAID_ORGANIZATIONS_PER_OWNER) return false;

  // A paying customer is not the threat, so the cap lifts once any organization
  // this user owns is past its trial and actually billing.
  const paying = await prisma.subscription.count({
    where: {
      referenceId: { in: owned.map((member) => member.organizationId) },
      status: "active",
    },
  });

  return paying === 0;
};
