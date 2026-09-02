import {
  accessForStatus,
  resolveEntitlement,
  type ResolvedEntitlement,
  type SubscriptionAccess,
} from "@dashboard/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { prisma } from "../../lib/prisma/prisma";
import { runUnscoped } from "../../lib/prisma/tenant-context";
import { redis } from "../../lib/redis/redis";

// The resolved entitlement is cached, not just the plan name: a contract's
// limits live on its row, so caching the name alone would hand every custom
// organization the tier table's answer instead of its own.
export type OrganizationEntitlement = ResolvedEntitlement & {
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
      select: {
        plan: true,
        status: true,
        seats: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
      orderBy: { periodEnd: "desc" },
    })
  );

  const entitlement: OrganizationEntitlement = {
    ...resolveEntitlement(subscription),
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

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const ALLOW_READ_ONLY_KEY = "allow_read_only";

// For the few writes a read-only organization must still be able to make, of
// which deleting its own data is the one that matters: refusing that would hold
// the records hostage to a subscription.
export const AllowReadOnly = () => SetMetadata(ALLOW_READ_ONLY_KEY, true);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session) throw new UnauthorizedException("No session found");

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) throw new ForbiddenException("No active organization");

    const entitlement = await getOrganizationEntitlement(organizationId);
    const access = accessForStatus(entitlement.status);

    if (access === "locked") {
      throw new ForbiddenException({
        code: "SUBSCRIPTION_LOCKED",
        status: entitlement.status,
        message: "This organization has no active subscription.",
      });
    }

    const allowReadOnly = this.reflector.getAllAndOverride<boolean>(
      ALLOW_READ_ONLY_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Reads survive a dead subscription so the organization can still see and
    // export its own records; only writes close.
    if (
      access === "read_only" &&
      !allowReadOnly &&
      !READ_METHODS.has(request.method)
    ) {
      throw new ForbiddenException({
        code: "SUBSCRIPTION_READ_ONLY",
        status: entitlement.status,
        message: "Your subscription has ended. Renew to make changes.",
      });
    }

    // The entitlement guard reads this rather than looking the plan up again.
    request.entitlement = entitlement;
    request.subscriptionAccess = access satisfies SubscriptionAccess;

    return true;
  }
}
