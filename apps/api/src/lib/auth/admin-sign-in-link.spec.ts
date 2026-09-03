import { ROLES } from "@dashboard/shared";

jest.mock("../prisma/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    verification: { deleteMany: jest.fn(), create: jest.fn() },
    adminActivityLog: { create: jest.fn() },
  },
}));

jest.mock("../../config/app-config", () => ({
  appConfig: { WEBSITE_URL: "https://portal.example.com" },
}));

import {
  createAdminSignInLink,
  identifierForToken,
  isLinkable,
  redeemAdminSignInLink,
  SIGN_IN_LINK_TTL_SECONDS,
  SignInLinkError,
} from "./admin-sign-in-link";
import { prisma } from "../prisma/prisma";

const db = prisma as unknown as {
  user: { findUnique: jest.Mock };
  verification: { deleteMany: jest.Mock; create: jest.Mock };
  adminActivityLog: { create: jest.Mock };
};

const ADMIN = { id: "admin-1", name: "Support Lead" };

const call = (reason = "Ticket 1423 lost passkey") =>
  createAdminSignInLink({
    targetUserId: "user-1",
    admin: ADMIN,
    reason,
    ipAddress: "203.0.113.4",
  });

beforeEach(() => {
  jest.clearAllMocks();
});

// A link into an admin account would hand over the admin surface itself.
describe("isLinkable", () => {
  it.each([ROLES.SUPPORT, ROLES.SUPER_ADMIN])("rejects %s", (role) => {
    expect(isLinkable({ role, banned: false })).toBe(false);
  });

  it("rejects a banned customer", () => {
    expect(isLinkable({ role: ROLES.USER, banned: true })).toBe(false);
  });

  it("admits an ordinary customer", () => {
    expect(isLinkable({ role: ROLES.USER, banned: false })).toBe(true);
  });
});

describe("identifierForToken", () => {
  it("stores a hash, never the token", () => {
    const identifier = identifierForToken("plain-token");

    expect(identifier).not.toContain("plain-token");
    expect(identifier).toBe(identifierForToken("plain-token"));
  });
});

describe("createAdminSignInLink", () => {
  it("refuses a support account", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Agent",
      role: ROLES.SUPPORT,
      banned: false,
    });

    await expect(call()).rejects.toThrow(
      "Sign-in links are only for customer accounts"
    );
    expect(db.verification.create).not.toHaveBeenCalled();
  });

  it("refuses a banned account", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Owner",
      role: ROLES.USER,
      banned: true,
    });

    await expect(call()).rejects.toThrow("This account is banned");
    expect(db.verification.create).not.toHaveBeenCalled();
  });

  it("refuses a user that does not exist", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(call()).rejects.toThrow("User not found");
  });

  it("retires the previous link, stores only a hash, and audits the issue", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Owner",
      role: ROLES.USER,
      banned: false,
    });

    const { url, expiresAt } = await call();
    const token = new URL(url).searchParams.get("token") ?? "";

    expect(db.verification.deleteMany).toHaveBeenCalledTimes(1);

    const stored = db.verification.create.mock.calls[0][0].data;
    expect(stored.identifier).toBe(identifierForToken(token));
    expect(stored.identifier).not.toContain(token);
    expect(JSON.parse(stored.value)).toEqual({
      userId: "user-1",
      adminId: ADMIN.id,
      adminName: ADMIN.name,
      reason: "Ticket 1423 lost passkey",
    });

    const ttl = new Date(expiresAt).getTime() - Date.now();
    expect(ttl).toBeLessThanOrEqual(SIGN_IN_LINK_TTL_SECONDS * 1000);
    expect(ttl).toBeGreaterThan(SIGN_IN_LINK_TTL_SECONDS * 1000 - 5000);

    expect(db.adminActivityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: ADMIN.id,
        action: "CREATE_SIGN_IN_LINK",
        targetUserId: "user-1",
        details: "Ticket 1423 lost passkey",
        ipAddress: "203.0.113.4",
      }),
    });
  });
});

// The half that grants the session, so every refusal path is asserted here.
describe("redeemAdminSignInLink", () => {
  const PAYLOAD = {
    userId: "user-1",
    adminId: ADMIN.id,
    adminName: ADMIN.name,
    reason: "Ticket 1423 lost passkey",
  };

  const CUSTOMER = {
    id: "user-1",
    name: "Owner",
    role: ROLES.USER,
    banned: false,
  };

  // Stands in for Better Auth's internalAdapter: one live row, consumed once.
  const fakeAdapter = (row: { value: string; expiresAt: Date } | null) => {
    let remaining = row;

    return {
      consumeVerificationValue: jest.fn(async () => {
        const taken = remaining;
        remaining = null;
        return taken;
      }),
      findUserById: jest.fn(async (id: string) => ({ id, email: "o@x.com" })),
      createSession: jest.fn(async (userId: string) => ({
        token: "session-token",
        userId,
      })),
    };
  };

  const liveRow = () => ({
    value: JSON.stringify(PAYLOAD),
    expiresAt: new Date(Date.now() + 60_000),
  });

  it("signs in the target and audits the redemption", async () => {
    db.user.findUnique.mockResolvedValue(CUSTOMER);
    const adapter = fakeAdapter(liveRow());

    const { user, session } = await redeemAdminSignInLink("tok", adapter);

    expect(adapter.consumeVerificationValue).toHaveBeenCalledWith(
      identifierForToken("tok")
    );
    expect(adapter.createSession).toHaveBeenCalledWith("user-1");
    expect(user.id).toBe("user-1");
    expect(session).toEqual({ token: "session-token", userId: "user-1" });
    expect(db.adminActivityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: ADMIN.id,
        action: "USE_SIGN_IN_LINK",
        targetUserId: "user-1",
        details: PAYLOAD.reason,
      }),
    });
  });

  it("refuses a second use of the same token", async () => {
    db.user.findUnique.mockResolvedValue(CUSTOMER);
    const adapter = fakeAdapter(liveRow());

    await redeemAdminSignInLink("tok", adapter);

    await expect(redeemAdminSignInLink("tok", adapter)).rejects.toThrow(
      SignInLinkError
    );
    expect(adapter.createSession).toHaveBeenCalledTimes(1);
  });

  it("refuses an unknown token", async () => {
    const adapter = fakeAdapter(null);

    await expect(redeemAdminSignInLink("nope", adapter)).rejects.toThrow(
      SignInLinkError
    );
    expect(adapter.createSession).not.toHaveBeenCalled();
  });

  it("refuses an expired link", async () => {
    db.user.findUnique.mockResolvedValue(CUSTOMER);
    const adapter = fakeAdapter({
      value: JSON.stringify(PAYLOAD),
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(redeemAdminSignInLink("tok", adapter)).rejects.toThrow(
      SignInLinkError
    );
    expect(adapter.createSession).not.toHaveBeenCalled();
    expect(db.adminActivityLog.create).not.toHaveBeenCalled();
  });

  // Both cases can change in the ten minutes a link is live.
  it("refuses an account banned since the link was issued", async () => {
    db.user.findUnique.mockResolvedValue({ ...CUSTOMER, banned: true });
    const adapter = fakeAdapter(liveRow());

    await expect(redeemAdminSignInLink("tok", adapter)).rejects.toThrow(
      SignInLinkError
    );
    expect(adapter.createSession).not.toHaveBeenCalled();
  });

  it("refuses an account promoted to support since the link was issued", async () => {
    db.user.findUnique.mockResolvedValue({ ...CUSTOMER, role: ROLES.SUPPORT });
    const adapter = fakeAdapter(liveRow());

    await expect(redeemAdminSignInLink("tok", adapter)).rejects.toThrow(
      SignInLinkError
    );
    expect(adapter.createSession).not.toHaveBeenCalled();
  });

  it("refuses a deleted account", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const adapter = fakeAdapter(liveRow());

    await expect(redeemAdminSignInLink("tok", adapter)).rejects.toThrow(
      SignInLinkError
    );
    expect(adapter.createSession).not.toHaveBeenCalled();
  });

  // A link minted for one account must not open another.
  it("reads the target from the stored payload, not the caller", async () => {
    db.user.findUnique.mockResolvedValue(CUSTOMER);
    const adapter = fakeAdapter(liveRow());

    await redeemAdminSignInLink("tok", adapter);

    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    );
  });
});
