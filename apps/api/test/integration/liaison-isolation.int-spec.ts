import { prisma } from "../../src/lib/prisma/prisma";
import { runWithTenant } from "../../src/lib/prisma/tenant-context";
import {
  dropTenantPair,
  seedTenantPair,
  type TenantPair,
} from "./tenant-fixture";

let tenants: TenantPair;

const seedExpense = (tenant: TenantPair["a"], description: string) =>
  runWithTenant(tenant.organizationId, () =>
    prisma.expense.create({
      data: {
        amount: 10,
        description,
        notes: "",
        imageUrl: "",
        memberId: tenant.memberId,
        organizationId: tenant.organizationId,
      },
      select: { id: true },
    })
  );

beforeAll(async () => {
  tenants = await seedTenantPair();
});

afterAll(async () => {
  await dropTenantPair(tenants);
  await prisma.$disconnect();
});

describe("liaison rows across two live organizations", () => {
  it("findMany with no where clause returns only the active organization", async () => {
    const mine = await seedExpense(tenants.a, "org a expense");
    const theirs = await seedExpense(tenants.b, "org b expense");

    const rows = await runWithTenant(tenants.a.organizationId, () =>
      prisma.expense.findMany({ select: { id: true } })
    );

    const ids = rows.map((row) => row.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(theirs.id);
  });

  it("a findFirst by primary key cannot reach the other organization", async () => {
    const theirs = await seedExpense(tenants.b, "org b expense by id");

    const row = await runWithTenant(tenants.a.organizationId, () =>
      prisma.expense.findFirst({ where: { id: theirs.id } })
    );

    expect(row).toBeNull();
  });

  it("updateMany cannot write across the tenant boundary", async () => {
    const theirs = await seedExpense(tenants.b, "org b expense untouched");

    const result = await runWithTenant(tenants.a.organizationId, () =>
      prisma.expense.updateMany({
        where: { id: theirs.id },
        data: { description: "overwritten" },
      })
    );

    expect(result.count).toBe(0);

    const after = await runWithTenant(tenants.b.organizationId, () =>
      prisma.expense.findFirstOrThrow({ where: { id: theirs.id } })
    );
    expect(after.description).toBe("org b expense untouched");
  });

  it("a create cannot plant a row in another organization", async () => {
    await expect(
      runWithTenant(tenants.a.organizationId, () =>
        prisma.expense.create({
          data: {
            amount: 1,
            description: "smuggled",
            notes: "",
            imageUrl: "",
            memberId: tenants.b.memberId,
            organizationId: tenants.b.organizationId,
          },
        })
      )
    ).rejects.toThrow(/outside the active organization/);
  });

  it("mileage and marketing carry the same guarantee", async () => {
    const theirMileage = await runWithTenant(tenants.b.organizationId, () =>
      prisma.mileage.create({
        data: {
          destination: "b",
          countiesMarketed: "b",
          beginningMileage: 0,
          endingMileage: 10,
          totalMiles: 10,
          rateType: "FEDERAL",
          ratePerMile: 0.5,
          reimbursementAmount: 5,
          memberId: tenants.b.memberId,
          organizationId: tenants.b.organizationId,
        },
        select: { id: true },
      })
    );

    const theirMarketing = await runWithTenant(tenants.b.organizationId, () =>
      prisma.marketing.create({
        data: {
          facility: "b facility",
          touchpoints: ["PHONE"],
          talkedTo: "b",
          memberId: tenants.b.memberId,
          organizationId: tenants.b.organizationId,
        },
        select: { id: true },
      })
    );

    const [mileage, marketing] = await runWithTenant(
      tenants.a.organizationId,
      () =>
        Promise.all([
          prisma.mileage.findFirst({ where: { id: theirMileage.id } }),
          prisma.marketing.findFirst({ where: { id: theirMarketing.id } }),
        ])
    );

    expect(mileage).toBeNull();
    expect(marketing).toBeNull();
  });
});
