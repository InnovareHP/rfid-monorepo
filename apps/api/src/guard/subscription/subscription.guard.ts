import { isSubscriptionActive } from "@dashboard/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";
import { runUnscoped } from "../../lib/prisma/tenant-context";
import { redis } from "../../lib/redis/redis";

export type OrganizationEntitlement = {
  plan: string | null;
  status: string | null;
};

const cacheKey = (organizationId: string) => `subscription:${organizationId}`;

// Short enough that a cancellation takes effect within a minute on its own, and
// the Stripe webhook clears the key the moment the status actually changes.
const CACHE_TTL_SECONDS = 60;

export const invalidateSubscriptionCache = (organizationId: string) =>
  redis.del(cacheKey(organizationId));

// Subscription rows are keyed by organization but carry no organizationId
// column, so the tenant guard cannot scope them and the read runs unscoped.
export const getOrganizationEntitlement = async (
  organizationId: string
): Promise<OrganizationEntitlement> => {
  const cached = await redis.get(cacheKey(organizationId));
  if (cached) return JSON.parse(cached) as OrganizationEntitlement;

  const subscription = await runUnscoped(() =>
    prisma.subscription.findFirst({
      where: { referenceId: organizationId },
      select: { plan: true, status: true },
      orderBy: { periodEnd: "desc" },
    })
  );

  const entitlement: OrganizationEntitlement = {
    plan: subscription?.plan ?? null,
    status: subscription?.status ?? null,
  };

  await redis.set(
    cacheKey(organizationId),
    JSON.stringify(entitlement),
    "EX",
    CACHE_TTL_SECONDS
  );

  return entitlement;
};

@Injectable()
export class SubscriptionGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session) throw new UnauthorizedException("No session found");

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) throw new ForbiddenException("No active organization");

    const entitlement = await getOrganizationEntitlement(organizationId);

    if (!isSubscriptionActive(entitlement.status)) {
      throw new ForbiddenException("Subscription inactive or expired");
    }

    // The entitlement guard reads this rather than looking the plan up again.
    request.entitlement = entitlement;

    return true;
  }
}
