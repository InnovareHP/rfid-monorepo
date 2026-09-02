import { ROLES } from "@dashboard/shared";

// Records what each handler declared at decoration time. The real decorator
// cannot run here: it pulls in better-auth, which ships ESM that ts-jest will
// not transform. What matters is that a handler declares the gate at all.
const mockDeclaredRoles = new Map<string, string[]>();

jest.mock("@thallesp/nestjs-better-auth", () => ({
  AuthGuard: class AuthGuard {},
  UserSession: class UserSession {},
  Roles: (roles: string[]) => (_target: object, key: string) => {
    mockDeclaredRoles.set(key, roles);
  },
}));

jest.mock("src/guard/onboarding/onboarding.guard", () => ({
  OnboardingGuard: class OnboardingGuard {},
}));

jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    user: { count: jest.fn() },
    organization: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    member: { findFirst: jest.fn() },
    contractAgreement: { findFirst: jest.fn() },
    adminActivityLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockInvalidateSubscriptionCache = jest.fn();

jest.mock("src/guard/subscription/subscription.guard", () => ({
  invalidateSubscriptionCache: (...args: unknown[]) =>
    mockInvalidateSubscriptionCache(...args),
}));

jest.mock("src/lib/auth/auth", () => ({ auth: { api: {} } }));

jest.mock("src/lib/auth/session-context", () => ({
  invalidateOrganizationSessionContext: jest.fn(),
}));

jest.mock("src/lib/prisma/tenant-context", () => ({
  runUnscoped: (fn: () => unknown) => fn(),
}));

const mockCustomersCreate = jest.fn();
const mockCustomersRetrieve = jest.fn();
const mockCustomersUpdate = jest.fn();
jest.mock("src/lib/stripe/stripe", () => ({
  stripe: {
    customers: {
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      retrieve: (...args: unknown[]) => mockCustomersRetrieve(...args),
      update: (...args: unknown[]) => mockCustomersUpdate(...args),
    },
  },
}));

import { prisma } from "../../lib/prisma/prisma";
import type { AdminEntitlementData } from "./dto/user.dto";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

const db = prisma as unknown as {
  user: { count: jest.Mock };
  organization: {
    count: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  subscription: {
    count: jest.Mock;
    groupBy: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  member: { findFirst: jest.Mock };
  contractAgreement: { findFirst: jest.Mock };
  adminActivityLog: { create: jest.Mock };
};

const rolesOn = (handlerName: string) =>
  mockDeclaredRoles.get(handlerName) ?? [];

const ADMIN_HANDLERS = [
  "createAdminUser",
  "issueAdminContractInvoice",
  "getAdminUsers",
  "getAdminUserById",
  "getActivityLog",
  "getAdminMetrics",
  "getAdminOrganizations",
  "getAdminOrganizationById",
  "setAdminOrganizationEntitlement",
  "getAdminOrganizationBaa",
];

describe("UserController admin surface", () => {
  // These routes read across every tenant by design, so the role gate is the
  // only thing standing between them and any signed-in user.
  it.each(ADMIN_HANDLERS)("gates %s on super_admin", (handlerName) => {
    expect(rolesOn(handlerName)).toContain(ROLES.SUPER_ADMIN);
  });

  it("covers every admin route the controller exposes", () => {
    const handlers = Object.getOwnPropertyNames(
      UserController.prototype
    ).filter((name) => name.toLowerCase().includes("admin"));

    // A new admin handler that is not in ADMIN_HANDLERS fails here, so it cannot
    // ship without someone asserting its role gate.
    expect(handlers.sort()).toEqual(
      [...ADMIN_HANDLERS, "getActivityLog"]
        .filter((name) => name.toLowerCase().includes("admin"))
        .sort()
    );
  });
});

describe("UserService.getAdminMetrics", () => {
  const service = new UserService();

  beforeEach(() => {
    jest.clearAllMocks();
    db.user.count.mockResolvedValue(0);
    db.organization.count.mockResolvedValue(0);
    db.subscription.count.mockResolvedValue(0);
    db.subscription.groupBy.mockResolvedValue([]);
  });

  it("counts in the database instead of paging rows", async () => {
    await service.getAdminMetrics();

    expect(db.user.count).toHaveBeenCalled();
    expect(db.organization.count).toHaveBeenCalled();
    // A row-returning read would mean the old count-in-the-browser approach.
    expect(db.organization.findMany).not.toHaveBeenCalled();
  });

  it("labels a subscription row with no status rather than dropping it", async () => {
    db.subscription.groupBy.mockResolvedValue([
      { status: null, _count: { _all: 3 } },
      { status: "active", _count: { _all: 7 } },
    ]);

    const metrics = await service.getAdminMetrics();

    expect(metrics.subscriptions.byStatus).toEqual([
      { status: "unknown", count: 3 },
      { status: "active", count: 7 },
    ]);
  });

  it("bounds expiring trials to the next seven days", async () => {
    await service.getAdminMetrics();

    const trialCall = db.subscription.count.mock.calls.find(
      ([arg]) => arg?.where?.status === "trialing"
    );

    const { gte, lte } = trialCall[0].where.trialEnd;
    const spanDays = (lte.getTime() - gte.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(spanDays)).toBe(7);
  });
});

describe("UserService.getAdminOrganizationById", () => {
  const service = new UserService();

  const org = {
    id: "org-1",
    name: "Acme Health",
    slug: "acme",
    logo: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    metadata: null,
    hipaaEnabled: true,
    baaAcceptedAt: new Date("2026-02-01T00:00:00.000Z"),
    baaVersion: "1.0",
    retentionDays: 2555,
    stripeCustomerId: "cus_123",
    members: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.organization.findUnique.mockResolvedValue(org);
    db.subscription.findFirst.mockResolvedValue(null);
    db.contractAgreement.findFirst.mockResolvedValue(null);
  });

  it("reports the compliance state a plan-only view cannot answer", async () => {
    const detail = await service.getAdminOrganizationById("org-1");

    expect(detail.compliance).toMatchObject({
      hipaaEnabled: true,
      baaVersion: "1.0",
      retentionDays: 2555,
      agreement: null,
    });
  });

  it("resolves a negotiated contract, not the tier name it stores", async () => {
    db.subscription.findFirst.mockResolvedValue({
      plan: "custom",
      status: "active",
      isCustom: true,
      contractLabel: "Northwind pilot",
      customLimits: { seats: 40, features: ["hipaa", "export"] },
    });

    const detail = await service.getAdminOrganizationById("org-1");

    expect(detail.entitlement).toMatchObject({
      label: "Northwind pilot",
      seats: 40,
      features: ["hipaa", "export"],
      isCustom: true,
    });
    expect(detail.compliance.planSupportsHipaa).toBe(true);
  });

  it("falls back to the tier when a contract is unreadable", async () => {
    db.subscription.findFirst.mockResolvedValue({
      plan: "growth",
      status: "active",
      isCustom: true,
      customLimits: { seats: 0 },
    });

    const detail = await service.getAdminOrganizationById("org-1");

    expect(detail.entitlement.isCustom).toBe(false);
    expect(detail.entitlement.label).toBe("growth");
    expect(detail.compliance.planSupportsHipaa).toBe(false);
  });

  it("surfaces the signer of the latest executed BAA", async () => {
    db.contractAgreement.findFirst.mockResolvedValue({
      termsVersion: "1.0",
      signedAt: new Date("2026-02-01T00:00:00.000Z"),
      signerName: "Dana Signer",
      signerTitle: "COO",
      signerEmail: "dana@acme.test",
      companyLegalName: "Acme Health LLC",
      acceptanceMethod: "signature",
      ipAddress: "203.0.113.7",
      document: Buffer.from("pdf"),
    });

    const detail = await service.getAdminOrganizationById("org-1");

    expect(detail.compliance.agreement).toMatchObject({
      signerName: "Dana Signer",
      termsVersion: "1.0",
      hasDocument: true,
    });
    // The bytes stay behind the download route.
    expect(detail.compliance.agreement).not.toHaveProperty("document");
  });
});

describe("UserService.setAdminOrganizationEntitlement", () => {
  const service = new UserService();

  beforeEach(() => {
    jest.clearAllMocks();
    db.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Acme Health",
      stripeCustomerId: "cus_existing",
    });
    // Stripe will not send an invoice to a customer with no email, so the
    // owner's address is what every contract path reaches for.
    db.member.findFirst.mockResolvedValue({
      user: { email: "owner@acme.test", name: "Olive Owner" },
    });
    mockCustomersRetrieve.mockResolvedValue({
      id: "cus_existing",
      email: "owner@acme.test",
    });
    db.subscription.findFirst.mockResolvedValue({
      id: "sub-1",
      isCustom: false,
      stripeCustomerId: "cus_existing",
    });
    db.subscription.update.mockResolvedValue({
      plan: "growth",
      status: "active",
      isCustom: true,
      contractLabel: "Northwind pilot",
      customLimits: { seats: 40, features: ["hipaa"] },
    });
  });

  const grant: AdminEntitlementData = {
    contract: {
      label: "Northwind pilot",
      seats: 40,
      features: ["hipaa"],
      priceCents: 240_000,
      setupFeeCents: 0,
      billingInterval: "annual",
    },
  };

  it("writes the contract and returns what the gates will now read", async () => {
    const result = await service.setAdminOrganizationEntitlement(
      "admin-1",
      "Ada Admin",
      "org-1",
      grant
    );

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({
          isCustom: true,
          contractLabel: "Northwind pilot",
          customLimits: { seats: 40, features: ["hipaa"] },
        }),
      })
    );
    expect(result).toMatchObject({ label: "Northwind pilot", seats: 40 });
  });

  // Without this the grant sits behind the guard's Redis cache and reads as a
  // feature flag that did nothing.
  it("invalidates the entitlement cache for that organization", async () => {
    await service.setAdminOrganizationEntitlement(
      "admin-1",
      "Ada Admin",
      "org-1",
      grant
    );

    expect(mockInvalidateSubscriptionCache).toHaveBeenCalledWith("org-1");
  });

  it("audits the grant against the organization", async () => {
    await service.setAdminOrganizationEntitlement(
      "admin-1",
      "Ada Admin",
      "org-1",
      grant
    );

    expect(db.adminActivityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: "admin-1",
        adminName: "Ada Admin",
        action: "SET_ENTITLEMENT",
        targetOrgId: "org-1",
        targetName: "Acme Health",
        // The price is part of the record: an entitlement grant is a billing
        // decision, and the log has to say what was agreed.
        details: "Northwind pilot: 40 seats, $2,400 annual, features [hipaa]",
      }),
    });
  });

  it("clears the contract back to the plan tier", async () => {
    db.subscription.update.mockResolvedValue({
      plan: "growth",
      status: "active",
      isCustom: false,
      contractLabel: null,
      customLimits: null,
    });

    const result = await service.setAdminOrganizationEntitlement(
      "admin-1",
      "Ada Admin",
      "org-1",
      { contract: null }
    );

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isCustom: false, contractLabel: null }),
      })
    );
    expect(result).toMatchObject({ label: "growth", isCustom: false });
  });

  it("creates the row and a Stripe customer when the org never reached checkout", async () => {
    db.subscription.findFirst.mockResolvedValue(null);
    db.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Northwind",
      stripeCustomerId: null,
    });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    db.subscription.create.mockResolvedValue({
      id: "sub-new",
      plan: "custom",
      status: "contract",
      isCustom: true,
      contractLabel: "Northwind pilot",
      customLimits: { seats: 40, features: ["hipaa"] },
      seats: 40,
    });

    const result = await service.setAdminOrganizationEntitlement(
      "admin-1",
      "Ada Admin",
      "org-1",
      grant
    );

    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { organizationId: "org-1" } })
    );
    expect(db.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stripeCustomerId: "cus_new" } })
    );
    expect(db.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "contract",
          isCustom: true,
          stripeCustomerId: "cus_new",
          customPriceCents: 240_000,
          billingInterval: "annual",
        }),
      })
    );
    // Billable, so the organization is parked on the billing page until the
    // invoice clears rather than let straight into the dashboard.
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-new" },
      data: { status: "contract_unpaid" },
    });
    expect(mockInvalidateSubscriptionCache).toHaveBeenCalledWith("org-1");
    expect(result).toMatchObject({ label: "Northwind pilot", seats: 40 });
  });

  it("refuses to clear a contract on an org that has no subscription", async () => {
    db.subscription.findFirst.mockResolvedValue(null);

    await expect(
      service.setAdminOrganizationEntitlement("admin-1", "Ada Admin", "org-1", {
        contract: null,
      })
    ).rejects.toThrow(/no contract/i);

    expect(db.subscription.create).not.toHaveBeenCalled();
  });

  it("refuses an organization that does not exist", async () => {
    db.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.setAdminOrganizationEntitlement(
        "admin-1",
        "Ada Admin",
        "org-1",
        grant
      )
    ).rejects.toThrow(/not found/i);
  });
});
