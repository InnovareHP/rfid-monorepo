import { BAA_VERSION } from "@dashboard/shared";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

const redisGet = jest.fn();
const redisSet = jest.fn();
const redisDel = jest.fn();
jest.mock("../../lib/redis/redis", () => ({
  redis: {
    get: (...args: unknown[]) => redisGet(...args),
    set: (...args: unknown[]) => redisSet(...args),
    del: (...args: unknown[]) => redisDel(...args),
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

import { HipaaGuard } from "./hipaa.guard";

const ORG = "org_a";

const contextFor = (ip = "10.0.0.5", organizationId: string | null = ORG) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        session: {
          session: { activeOrganizationId: organizationId },
          user: { id: "user_a" },
        },
        headers: { "x-forwarded-for": ip },
        socket: { remoteAddress: ip },
      }),
    }),
  }) as any;

const organization = (overrides: Record<string, unknown> = {}) => ({
  hipaaEnabled: true,
  baaAcceptedAt: new Date("2026-08-01"),
  baaVersion: BAA_VERSION,
  ipAllowlist: [],
  ...overrides,
});

describe("HipaaGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue("OK");
    findOrganization.mockResolvedValue(organization());
    findUser.mockResolvedValue({ twoFactorEnabled: true });
    countPasskeys.mockResolvedValue(0);
  });

  it("rejects a request with no session", async () => {
    const context = { switchToHttp: () => ({ getRequest: () => ({}) }) } as any;
    await expect(new HipaaGuard().canActivate(context)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("passes an organization that has not enabled HIPAA mode", async () => {
    findOrganization.mockResolvedValue(
      organization({ hipaaEnabled: false, baaVersion: null })
    );

    await expect(new HipaaGuard().canActivate(contextFor())).resolves.toBe(
      true
    );
  });

  // An unreadable posture is not an allowed posture.
  it("blocks when the settings cannot be read", async () => {
    redisGet.mockRejectedValue(new Error("redis down"));

    await expect(new HipaaGuard().canActivate(contextFor())).rejects.toThrow(
      ForbiddenException
    );
  });

  it("blocks when the organization row is missing", async () => {
    findOrganization.mockResolvedValue(null);

    await expect(new HipaaGuard().canActivate(contextFor())).rejects.toThrow(
      ForbiddenException
    );
  });

  it("blocks an unsigned agreement", async () => {
    findOrganization.mockResolvedValue(
      organization({ baaAcceptedAt: null, baaVersion: null })
    );

    await expect(new HipaaGuard().canActivate(contextFor())).rejects.toThrow(
      /Business Associate Agreement/
    );
  });

  // A version bump has to close the gate, which a timestamp check alone misses.
  it("blocks an agreement signed against an older version", async () => {
    findOrganization.mockResolvedValue(
      organization({ baaVersion: "2020-01-01" })
    );

    await expect(new HipaaGuard().canActivate(contextFor())).rejects.toThrow(
      /Business Associate Agreement/
    );
  });

  it("allows an address inside an allowlisted CIDR range", async () => {
    findOrganization.mockResolvedValue(
      organization({ ipAllowlist: ["10.0.0.0/24"] })
    );

    await expect(
      new HipaaGuard().canActivate(contextFor("10.0.0.5"))
    ).resolves.toBe(true);
  });

  it("blocks an address outside every allowlist entry", async () => {
    findOrganization.mockResolvedValue(
      organization({ ipAllowlist: ["10.0.0.0/24", "192.168.1.1"] })
    );

    await expect(
      new HipaaGuard().canActivate(contextFor("10.0.1.5"))
    ).rejects.toThrow(/allowlist/);
  });

  it("accepts a passkey in place of an authenticator app", async () => {
    findUser.mockResolvedValue({ twoFactorEnabled: false });
    countPasskeys.mockResolvedValue(1);

    await expect(new HipaaGuard().canActivate(contextFor())).resolves.toBe(
      true
    );
  });

  it("blocks a user with neither a passkey nor two-factor enabled", async () => {
    findUser.mockResolvedValue({ twoFactorEnabled: false });
    countPasskeys.mockResolvedValue(0);

    await expect(new HipaaGuard().canActivate(contextFor())).rejects.toThrow(
      /passkey/
    );
  });

  // Every guard on the chain reads the org from the session, so a request
  // without one has nothing to enforce against yet.
  it("passes through when the session carries no organization", async () => {
    await expect(
      new HipaaGuard().canActivate(contextFor("10.0.0.5", null))
    ).resolves.toBe(true);
    expect(findOrganization).not.toHaveBeenCalled();
  });
});
