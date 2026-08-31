import { randomUUID } from "node:crypto";
import { ActivityType } from "@prisma/client";
import { LiaisonActivityService } from "../../src/api/liaison/liaison-activity.service";
import { LiaisonService } from "../../src/api/liaison/liaison.service";
import { prisma } from "../../src/lib/prisma/prisma";
import {
  runUnscoped,
  runWithTenant,
} from "../../src/lib/prisma/tenant-context";
import {
  dropTenantPair,
  seedTenantPair,
  type TenantPair,
} from "./tenant-fixture";

let tenants: TenantPair;
let liaisonMemberId: string;
let liaisonUserId: string;
let facilityA: { id: string };
let facilityB: { id: string };

const FACILITY_A = "Integration Facility A";
const FACILITY_B = "Integration Facility B";

const liaisonService = new LiaisonService();
const activityService = new LiaisonActivityService();

const seedFacility = (tenant: TenantPair["a"], recordName: string) =>
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

const createMarketing = (
  facility: string,
  overrides: Partial<{
    touchpoint: string[];
    talkedTo: string;
    reasonForVisit: string;
    notes: string;
  }> = {}
) =>
  runWithTenant(tenants.a.organizationId, () =>
    liaisonService.createMarketing(
      {
        facility,
        touchpoint: ["IN_PERSON_MEETING"],
        talkedTo: "Front desk",
        ...overrides,
      } as never,
      tenants.a.memberId,
      tenants.a.userId,
      tenants.a.organizationId
    )
  );

beforeAll(async () => {
  tenants = await seedTenantPair();
  facilityA = await seedFacility(tenants.a, FACILITY_A);
  facilityB = await seedFacility(tenants.b, FACILITY_B);

  // The board mirror only fires for a liaison, and the fixture member is an
  // owner. The liaison gets its own user so the member lookup cannot resolve
  // to the owner row instead.
  liaisonMemberId = `int-member-liaison-${randomUUID()}`;
  liaisonUserId = `int-user-liaison-${randomUUID()}`;
  await runUnscoped(async () => {
    const now = new Date();

    await prisma.user.create({
      data: {
        id: liaisonUserId,
        name: "Integration liaison",
        email: `${liaisonUserId}@integration.test`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.member.create({
      data: {
        id: liaisonMemberId,
        organizationId: tenants.a.organizationId,
        userId: liaisonUserId,
        role: "liason",
        createdAt: now,
      },
    });
  });
});

afterAll(async () => {
  await runUnscoped(() =>
    prisma.user.deleteMany({ where: { id: liaisonUserId } })
  );
  await dropTenantPair(tenants);
  await prisma.$disconnect();
});

describe("a marketing log mirrored onto the board", () => {
  it("writes the marketing row, the activity, and the history entry", async () => {
    await createMarketing(FACILITY_A, {
      reasonForVisit: "Quarterly check-in",
      notes: "Asked for referral packets",
    });

    const [marketing, activity, history] = await runWithTenant(
      tenants.a.organizationId,
      async () =>
        Promise.all([
          prisma.marketing.findFirst({
            where: { facilityRecordId: facilityA.id },
          }),
          prisma.activity.findFirst({
            where: { recordId: facilityA.id },
            orderBy: { createdAt: "desc" },
          }),
          prisma.history.findFirst({
            where: { recordId: facilityA.id, column: "marketing" },
            orderBy: { createdAt: "desc" },
          }),
        ])
    );

    expect(marketing).toMatchObject({
      facility: FACILITY_A,
      touchpoints: ["IN_PERSON_MEETING"],
      organizationId: tenants.a.organizationId,
    });

    expect(activity).toMatchObject({
      title: "Marketing touchpoint: Quarterly check-in",
      description: "Talked to Front desk - Asked for referral packets",
      activityType: "MEETING",
      status: "COMPLETED",
      recordId: facilityA.id,
      createdBy: tenants.a.userId,
      organizationId: tenants.a.organizationId,
    });
    expect(activity?.completedAt).toBeInstanceOf(Date);

    expect(history).toMatchObject({
      organizationId: tenants.a.organizationId,
    });
  });

  it("types the activity from the touchpoint", async () => {
    await createMarketing(FACILITY_A, { touchpoint: ["PHONE"] });

    const activity = await runWithTenant(tenants.a.organizationId, () =>
      prisma.activity.findFirst({
        where: { recordId: facilityA.id },
        orderBy: { createdAt: "desc" },
      })
    );

    expect(activity?.activityType).toBe("CALL");
  });

  it("cannot mirror onto a facility that belongs to another organization", async () => {
    await expect(createMarketing(FACILITY_B)).rejects.toThrow("Lead not found");

    const activities = await runUnscoped(() =>
      prisma.activity.count({ where: { recordId: facilityB.id } })
    );

    expect(activities).toBe(0);
  });
});

describe("a board activity mirrored into the marketing log", () => {
  it("writes a marketing row for a liaison", async () => {
    const before = await runWithTenant(tenants.a.organizationId, () =>
      prisma.marketing.count({ where: { facilityRecordId: facilityA.id } })
    );

    await runWithTenant(tenants.a.organizationId, () =>
      activityService.logRecordActivity({
        recordId: facilityA.id,
        organizationId: tenants.a.organizationId,
        userId: liaisonUserId,
        activityType: ActivityType.CALL,
      })
    );

    const rows = await runWithTenant(tenants.a.organizationId, () =>
      prisma.marketing.findMany({
        where: { facilityRecordId: facilityA.id },
        orderBy: { createdAt: "desc" },
      })
    );

    expect(rows).toHaveLength(before + 1);
    expect(rows[0]).toMatchObject({
      facility: FACILITY_A,
      touchpoints: ["PHONE"],
      memberId: liaisonMemberId,
    });
  });

  it("writes nothing for a record in another organization", async () => {
    await runWithTenant(tenants.a.organizationId, () =>
      activityService.logRecordActivity({
        recordId: facilityB.id,
        organizationId: tenants.a.organizationId,
        userId: liaisonUserId,
        activityType: ActivityType.CALL,
      })
    );

    const rows = await runUnscoped(() =>
      prisma.marketing.count({ where: { facilityRecordId: facilityB.id } })
    );

    expect(rows).toBe(0);
  });
});
