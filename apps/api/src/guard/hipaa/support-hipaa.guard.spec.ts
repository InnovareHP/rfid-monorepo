import { BAA_VERSION, ROLES } from "@dashboard/shared";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

const redisGet = jest.fn();
const redisSet = jest.fn();
jest.mock("../../lib/redis/redis", () => ({
  redis: {
    get: (...args: unknown[]) => redisGet(...args),
    set: (...args: unknown[]) => redisSet(...args),
    del: jest.fn(),
  },
}));

const findOrganization = jest.fn();
const findUser = jest.fn();
const countPasskeys = jest.fn();
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    organization: { findUnique: (...a: unknown[]) => findOrganization(...a) },
    user: { findUnique: (...a: unknown[]) => findUser(...a) },
    passkey: { count: (...a: unknown[]) => countPasskeys(...a) },
  },
}));

jest.mock("../../lib/prisma/tenant-context", () => ({
  runUnscoped: (fn: () => unknown) => fn(),
}));

import { SupportHipaaGuard } from "./support-hipaa.guard";

const ORG = "org_a";

// An agent who also holds a Member row carries an activeOrganizationId, which is
// exactly the case a role-blind gate would misjudge.
const contextFor = (role: string, organizationId: string | null = ORG) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        session: {
          session: { activeOrganizationId: organizationId },
          user: { id: "user_a", role },
        },
        headers: { "x-forwarded-for": "203.0.113.9" },
        socket: { remoteAddress: "203.0.113.9" },
      }),
    }),
  }) as any;

describe("SupportHipaaGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue("OK");
    // A posture no tenant user could satisfy from this address.
    findOrganization.mockResolvedValue({
      hipaaEnabled: true,
      baaAcceptedAt: new Date("2026-08-01"),
      baaVersion: BAA_VERSION,
      ipAllowlist: ["10.0.0.0/24"],
    });
    findUser.mockResolvedValue({ twoFactorEnabled: true });
    countPasskeys.mockResolvedValue(0);
  });

  it("rejects a request with no session", async () => {
    const context = { switchToHttp: () => ({ getRequest: () => ({}) }) } as any;

    await expect(new SupportHipaaGuard().canActivate(context)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("skips a support agent holding a Member row in a gated org", async () => {
    await expect(
      new SupportHipaaGuard().canActivate(contextFor(ROLES.SUPPORT))
    ).resolves.toBe(true);

    // The skip must land before any posture lookup, not after passing one.
    expect(findOrganization).not.toHaveBeenCalled();
  });

  it("skips a super admin the same way", async () => {
    await expect(
      new SupportHipaaGuard().canActivate(contextFor(ROLES.SUPER_ADMIN))
    ).resolves.toBe(true);

    expect(findOrganization).not.toHaveBeenCalled();
  });

  it("still holds a tenant user to the organization's allowlist", async () => {
    await expect(
      new SupportHipaaGuard().canActivate(contextFor(ROLES.USER))
    ).rejects.toThrow(/allowlist/);
  });

  it("holds an org owner to the posture too", async () => {
    await expect(
      new SupportHipaaGuard().canActivate(contextFor(ROLES.OWNER))
    ).rejects.toThrow(ForbiddenException);
  });

  it("lets a tenant user through once the posture is satisfied", async () => {
    findOrganization.mockResolvedValue({
      hipaaEnabled: true,
      baaAcceptedAt: new Date("2026-08-01"),
      baaVersion: BAA_VERSION,
      ipAllowlist: [],
    });

    await expect(
      new SupportHipaaGuard().canActivate(contextFor(ROLES.USER))
    ).resolves.toBe(true);
  });
});
