import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma/prisma";
import { runUnscoped } from "../../src/lib/prisma/tenant-context";

export type Tenant = {
  organizationId: string;
  memberId: string;
  userId: string;
};
export type TenantPair = { a: Tenant; b: Tenant };

const seedTenant = async (label: string): Promise<Tenant> => {
  const now = new Date();
  const organizationId = `int-org-${label}-${randomUUID()}`;
  const userId = `int-user-${label}-${randomUUID()}`;
  const memberId = `int-member-${label}-${randomUUID()}`;

  await prisma.organization.create({
    data: { id: organizationId, name: `Integration ${label}`, createdAt: now },
  });

  await prisma.user.create({
    data: {
      id: userId,
      name: `Integration ${label}`,
      email: `${userId}@integration.test`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.member.create({
    data: {
      id: memberId,
      organizationId,
      userId,
      role: "owner",
      createdAt: now,
    },
  });

  return { organizationId, memberId, userId };
};

// Two live organizations in the same database, so a leak shows up as a real row.
export const seedTenantPair = (): Promise<TenantPair> =>
  runUnscoped(async () => ({
    a: await seedTenant("a"),
    b: await seedTenant("b"),
  }));

export const dropTenantPair = (pair: TenantPair) =>
  runUnscoped(async () => {
    const organizationIds = [pair.a.organizationId, pair.b.organizationId];
    const userIds = [pair.a.userId, pair.b.userId];

    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });
