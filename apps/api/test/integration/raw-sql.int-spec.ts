// The constructor opens a Redis-backed QueueEvents that this query never
// touches, so only the transport is stubbed. The database stays real.
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));

import { AnalyticsService } from "../../src/api/analytics/analytics.service";
import { prisma } from "../../src/lib/prisma/prisma";
import { runWithTenant } from "../../src/lib/prisma/tenant-context";
import {
  dropTenantPair,
  seedTenantPair,
  type TenantPair,
} from "./tenant-fixture";

let tenants: TenantPair;

const seedReferrals = (tenant: TenantPair["a"], count: number) =>
  runWithTenant(tenant.organizationId, () =>
    Promise.all(
      Array.from({ length: count }, (_, index) =>
        prisma.board.create({
          data: {
            recordName: `referral ${index}`,
            moduleType: "REFERRAL",
            organizationId: tenant.organizationId,
          },
        })
      )
    )
  );

beforeAll(async () => {
  tenants = await seedTenantPair();
  await seedReferrals(tenants.a, 2);
  await seedReferrals(tenants.b, 5);
});

afterAll(async () => {
  await dropTenantPair(tenants);
  await prisma.$disconnect();
});

// $queryRaw bypasses the tenant extension entirely, so the only thing standing
// between tenants here is the hand written WHERE clause.
describe("raw SQL analytics", () => {
  it("counts only the caller's referrals", async () => {
    const service = new AnalyticsService({} as never);
    const start = new Date(Date.now() - 86_400_000);
    const end = new Date(Date.now() + 86_400_000);

    const rows = await runWithTenant(tenants.a.organizationId, () =>
      service.getOutreachImpact(tenants.a.organizationId, start, end)
    );

    const total = rows.reduce((sum, row) => sum + row.total, 0);
    expect(total).toBe(2);
  });
});
