import { resolveEntitlement } from "@dashboard/shared";
import { prisma } from "../prisma/prisma";

// Kept out of auth-helper.ts because that file imports better-auth/api, which
// is ESM only and cannot be loaded by the CJS test runner. The rule is worth
// testing on its own, so it lives where a test can reach it.
export const requiresWorkEmail = async (organizationId: string) => {
  const [organization, subscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { hipaaEnabled: true },
    }),
    prisma.subscription.findFirst({
      where: { referenceId: organizationId },
      select: {
        plan: true,
        seats: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
    }),
  ]);

  // The plan is the promise, not the toggle: an organization that bought a
  // HIPAA-capable subscription can turn the mode on at any moment, and the
  // mailboxes its members already hold are what the BAA would then cover.
  return (
    organization?.hipaaEnabled === true ||
    resolveEntitlement(subscription).features.includes("hipaa")
  );
};
