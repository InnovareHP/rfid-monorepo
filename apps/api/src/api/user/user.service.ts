import { OnboardingStreamEvent, toSlug } from "@dashboard/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { AdminAction, Prisma } from "@prisma/client";
import { auth } from "src/lib/auth/auth";
import { prisma } from "src/lib/prisma/prisma";
import { v4 as uuidv4 } from "uuid";
import { OnboardingDto } from "./dto/user.schema";

@Injectable()
export class UserService {
  // Streams progress because organization creation also seeds the workspace
  async *onboarding(
    onboardDto: OnboardingDto,
    userId: string,
    headers: Headers
  ): AsyncGenerator<OnboardingStreamEvent> {
    const organizationName = onboardDto.organizationName.trim();

    yield {
      type: "progress",
      step: "creating-org",
      label: "Creating your organization",
    };

    const organization = await auth.api.createOrganization({
      body: {
        name: organizationName,
        slug: toSlug(organizationName),
        logo: onboardDto.logo,
        metadata: {
          user_id: userId,
          brandColor: onboardDto.brandColor,
        },
        userId,
        keepCurrentActiveOrganization: false,
      },
      headers,
    });

    if (!organization) throw new Error("Failed to create organization");

    yield {
      type: "progress",
      step: "saving-profile",
      label: "Saving your preferences",
    };

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isOnboarded: true,
        onboarding: {
          upsert: {
            create: {
              id: uuidv4(),
              hearAbout: onboardDto.foundUsOn,
              howToUse: "",
              whatToExpect: "",
            },
            update: {
              hearAbout: onboardDto.foundUsOn,
              howToUse: "",
              whatToExpect: "",
            },
          },
        },
      },
      select: { id: true },
    });

    yield { type: "done", organizationId: organization.id };
  }

  async getAdminUsers(params: {
    page: number;
    take: number;
    search?: string;
    roleFilter?: string;
  }) {
    const { page, take, search, roleFilter } = params;
    const skip = (page - 1) * take;

    const where: Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                email: { contains: search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          banned: true,
          banReason: true,
          banExpires: true,
          emailVerified: true,
          createdAt: true,
          members: {
            select: {
              id: true,
              role: true,
              createdAt: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        banned: u.banned,
        banReason: u.banReason,
        banExpires: u.banExpires ? u.banExpires.getTime() : null,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt.toISOString(),
        organizations: u.members.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          logo: m.organization.logo,
          memberRole: m.role,
          memberSince: m.createdAt.toISOString(),
        })),
      })),
      total,
    };
  }

  async getAdminUserById(userId: string) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        emailVerified: true,
        createdAt: true,
        members: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    if (!u) throw new NotFoundException("User not found");

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      banned: u.banned,
      banReason: u.banReason,
      banExpires: u.banExpires ? u.banExpires.getTime() : null,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt.toISOString(),
      organizations: u.members.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        logo: m.organization.logo,
        memberRole: m.role,
        memberSince: m.createdAt.toISOString(),
      })),
    };
  }

  // ─── Audit Log ───────────────────────────────────────────────────────

  async getActivityLog(params: {
    page: number;
    take: number;
    actionFilter?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, take, actionFilter, adminId, startDate, endDate } = params;
    const skip = (page - 1) * take;

    const where: Prisma.AdminActivityLogWhereInput = {
      ...(actionFilter ? { action: actionFilter as AdminAction } : {}),
      ...(adminId ? { adminId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.adminActivityLog.count({ where }),
    ]);

    // The log holds no user foreign keys, so avatars are looked up for whoever
    // still has an account. Names always come from the row.
    const userIds = [
      ...new Set(
        logs.flatMap((l) => [l.adminId, l.targetUserId].filter(Boolean))
      ),
    ] as string[];

    const images = new Map(
      (
        await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, image: true },
        })
      ).map((u) => [u.id, u.image])
    );

    return {
      logs: logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        action: l.action,
        details: l.details,
        targetOrgId: l.targetOrgId,
        ipAddress: l.ipAddress,
        admin: {
          id: l.adminId,
          name: l.adminName,
          image: images.get(l.adminId) ?? null,
        },
        targetUser: l.targetUserId
          ? {
              id: l.targetUserId,
              name: l.targetName ?? "Deleted account",
              image: images.get(l.targetUserId) ?? null,
            }
          : null,
      })),
      total,
    };
  }

  // ─── Organization Admin ─────────────────────────────────────────────

  async getAdminOrganizations(params: {
    page: number;
    take: number;
    search?: string;
  }) {
    const { page, take, search } = params;
    const skip = (page - 1) * take;

    const where: Prisma.OrganizationWhereInput = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              slug: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
          metadata: true,
          _count: { select: { members: true } },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    // Look up subscriptions for these orgs
    const orgIds = orgs.map((o) => o.id);
    const subscriptions = await prisma.subscription.findMany({
      where: { referenceId: { in: orgIds } },
      select: {
        referenceId: true,
        plan: true,
        status: true,
      },
    });
    const subMap = new Map(subscriptions.map((s) => [s.referenceId, s]));

    return {
      organizations: orgs.map((o) => {
        const sub = subMap.get(o.id);
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          logo: o.logo,
          createdAt: o.createdAt.toISOString(),
          metadata: o.metadata,
          memberCount: o._count.members,
          subscriptionStatus: sub?.status ?? null,
          subscriptionPlan: sub?.plan ?? null,
        };
      }),
      total,
    };
  }

  async getAdminOrganizationById(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        createdAt: true,
        metadata: true,
        members: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                banned: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!org) throw new NotFoundException("Organization not found");

    const subscription = await prisma.subscription.findFirst({
      where: { referenceId: orgId },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt.toISOString(),
      metadata: org.metadata,
      members: org.members.map((m) => ({
        memberId: m.id,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          banned: m.user.banned,
        },
      })),
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            periodStart: subscription.periodStart?.toISOString() ?? null,
            periodEnd: subscription.periodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            seats: subscription.seats,
            trialStart: subscription.trialStart?.toISOString() ?? null,
            trialEnd: subscription.trialEnd?.toISOString() ?? null,
            cancelAt: subscription.cancelAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}
