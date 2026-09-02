import { isBaaCurrent } from "@dashboard/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { clientIp } from "../../lib/http/client-ip";
import { prisma } from "../../lib/prisma/prisma";
import { runUnscoped } from "../../lib/prisma/tenant-context";
import { redis } from "../../lib/redis/redis";

export type HipaaSettings = {
  hipaaEnabled: boolean;
  baaAcceptedAt: string | null;
  baaVersion: string | null;
  ipAllowlist: string[];
};

const cacheKey = (organizationId: string) => `hipaa:org:${organizationId}`;

// Jittered so a cluster restart does not refill every organization's key in the
// same second.
const ttlSeconds = () => 15 + Math.floor(Math.random() * 16);

export const invalidateHipaaCache = (organizationId: string) =>
  redis.del(cacheKey(organizationId));

// Returns null when the settings cannot be read. Null blocks: a compliance
// posture that cannot be confirmed is treated as not satisfied.
export const getHipaaSettings = async (
  organizationId: string
): Promise<HipaaSettings | null> => {
  try {
    const cached = await redis.get(cacheKey(organizationId));
    if (cached) return JSON.parse(cached) as HipaaSettings;

    // Organization carries no organizationId column, so the tenant extension
    // cannot scope it and the read runs unscoped against the id itself.
    const organization = await runUnscoped(() =>
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          hipaaEnabled: true,
          baaAcceptedAt: true,
          baaVersion: true,
          ipAllowlist: true,
        },
      })
    );

    if (!organization) return null;

    const settings: HipaaSettings = {
      hipaaEnabled: organization.hipaaEnabled,
      baaAcceptedAt: organization.baaAcceptedAt?.toISOString() ?? null,
      baaVersion: organization.baaVersion,
      ipAllowlist: organization.ipAllowlist,
    };

    await redis.set(
      cacheKey(organizationId),
      JSON.stringify(settings),
      "EX",
      ttlSeconds()
    );

    return settings;
  } catch (error) {
    new Logger("HipaaGuard").error(
      `Compliance settings unreadable for ${organizationId}`,
      error as Error
    );
    return null;
  }
};

const ipv4ToInt = (address: string) => {
  const octets = address.split(".");
  if (octets.length !== 4) return null;

  let value = 0;
  for (const octet of octets) {
    const part = Number(octet);
    if (!Number.isInteger(part) || part < 0 || part > 255) return null;
    value = value * 256 + part;
  }
  return value;
};

// CIDR ranges are IPv4 only; an IPv6 client can still match an exact entry.
const matchesEntry = (address: string, entry: string) => {
  if (!entry.includes("/")) return entry.trim() === address;

  const [network, bits] = entry.split("/");
  const prefix = Number(bits);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const target = ipv4ToInt(address);
  const base = ipv4ToInt(network);
  if (target === null || base === null) return false;

  const mask = prefix === 0 ? 0 : (-1 << (32 - prefix)) >>> 0;
  return (target & mask) === (base & mask);
};

const twoFactorKey = (userId: string) => `hipaa:2fa:${userId}`;

// A passkey satisfies the requirement on its own: the authenticator proves
// possession and inherence in one step, and gating on twoFactorEnabled alone
// would lock every passkey-only user out of PHI.
export const hasSecondFactor = async (userId: string, fresh = false) => {
  // The gate is read right after a user enables 2FA, and a stale cache would
  // keep the modal up for the rest of the TTL.
  if (fresh) await redis.del(twoFactorKey(userId));

  const cached = await redis.get(twoFactorKey(userId));
  if (cached) return cached === "1";

  const [user, passkeys] = await runUnscoped(() =>
    Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorEnabled: true },
      }),
      prisma.passkey.count({ where: { userId } }),
    ])
  );

  const satisfied = Boolean(user?.twoFactorEnabled) || passkeys > 0;
  await redis.set(twoFactorKey(userId), satisfied ? "1" : "0", "EX", 60);
  return satisfied;
};

export const invalidateTwoFactorCache = (userId: string) =>
  redis.del(twoFactorKey(userId));

// Mounted on the routes that move PHI. Organizations without HIPAA mode pay one
// cached read and pass straight through.
@Injectable()
export class HipaaGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session) throw new UnauthorizedException("No session found");

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) return true;

    const settings = await getHipaaSettings(organizationId);
    if (!settings) {
      throw new ForbiddenException("Compliance settings could not be verified");
    }

    if (!settings.hipaaEnabled) return true;

    const address = clientIp(request);
    if (settings.ipAllowlist.length) {
      const allowed =
        address !== null &&
        settings.ipAllowlist.some((entry) => matchesEntry(address, entry));

      if (!allowed) {
        throw new ForbiddenException(
          "Your network is not on the organization's allowlist"
        );
      }
    }

    if (!isBaaCurrent(settings.baaAcceptedAt, settings.baaVersion)) {
      throw new ForbiddenException(
        "A current Business Associate Agreement is required before this data can be accessed"
      );
    }

    if (!(await hasSecondFactor(session.user.id))) {
      throw new ForbiddenException(
        "Two-factor authentication or a passkey is required to access this data"
      );
    }

    return true;
  }
}
