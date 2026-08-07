import { prisma } from "../../src/lib/prisma/prisma";
import { runWithTenant } from "../../src/lib/prisma/tenant-context";
import {
  dropTenantPair,
  seedTenantPair,
  type TenantPair,
} from "./tenant-fixture";

let tenants: TenantPair;
let recordB: { id: string };
let notificationB: { id: string };

const seedRecord = (tenant: TenantPair["a"], recordName: string) =>
  runWithTenant(tenant.organizationId, () =>
    prisma.board.create({
      data: {
        recordName,
        moduleType: "LEAD",
        organizationId: tenant.organizationId,
      },
      select: { id: true },
    })
  );

beforeAll(async () => {
  tenants = await seedTenantPair();
  await seedRecord(tenants.a, "org a record");
  recordB = await seedRecord(tenants.b, "org b record");

  notificationB = await runWithTenant(tenants.b.organizationId, () =>
    prisma.boardNotificationState.create({
      data: { recordId: recordB.id, lastSeen: new Date() },
      select: { id: true },
    })
  );
});

afterAll(async () => {
  await dropTenantPair(tenants);
  await prisma.$disconnect();
});

describe("child rows whose organization comes from a scoped parent", () => {
  it("the scoped parent is unreachable across the boundary", async () => {
    const row = await runWithTenant(tenants.a.organizationId, () =>
      prisma.board.findFirst({ where: { id: recordB.id } })
    );

    expect(row).toBeNull();
  });

  it("reading the child through its parent relation is safe", async () => {
    const rows = await runWithTenant(tenants.a.organizationId, () =>
      prisma.boardNotificationState.findMany({
        where: { record: { organizationId: tenants.a.organizationId } },
        select: { id: true },
      })
    );

    expect(rows.map((row) => row.id)).not.toContain(notificationB.id);
  });

  // Tripwire, not an endorsement. BoardNotificationState has no organizationId,
  // so the extension cannot scope it and a bare id query crosses the boundary.
  // Every caller must resolve the parent first. Delete this test once the model
  // carries the column and the extension covers it.
  it("querying the child by id alone still crosses the boundary", async () => {
    const row = await runWithTenant(tenants.a.organizationId, () =>
      prisma.boardNotificationState.findFirst({
        where: { recordId: recordB.id },
        select: { id: true },
      })
    );

    expect(row?.id).toBe(notificationB.id);
  });
});
