import { Injectable, NotFoundException } from "@nestjs/common";
import { AdminAction, Prisma } from "@prisma/client";
import { auth } from "src/lib/auth/auth";
import { prisma } from "src/lib/prisma/prisma";
import { v4 as uuidv4 } from "uuid";
import { OnboardingDto } from "./dto/user.schema";

@Injectable()
export class UserService {
  async onboarding(onboardDto: OnboardingDto, userId: string) {
    const user = await prisma.user.update({
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
      select: {
        accounts: {
          select: {
            accountId: true,
            providerId: true,
          },
        },
      },
    });

    return user;
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

  async logAdminAction(params: {
    adminId: string;
    action: AdminAction;
    targetUserId?: string;
    targetOrgId?: string;
    details?: string;
    ipAddress?: string;
  }) {
    return prisma.adminActivityLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetUserId: params.targetUserId,
        targetOrgId: params.targetOrgId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  }

  async getActivityLog(params: {
    page: number;
    take: number;
    actionFilter?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, take, actionFilter, startDate, endDate } = params;
    const skip = (page - 1) * take;

    const where: Prisma.AdminActivityLogWhereInput = {
      ...(actionFilter ? { action: actionFilter as AdminAction } : {}),
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
        include: {
          adminUser: {
            select: { id: true, name: true, image: true },
          },
          targetUser: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.adminActivityLog.count({ where }),
    ]);

    return {
      logs: logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        action: l.action,
        details: l.details,
        targetOrgId: l.targetOrgId,
        admin: {
          id: l.adminUser.id,
          name: l.adminUser.name,
          image: l.adminUser.image,
        },
        targetUser: l.targetUser
          ? {
              id: l.targetUser.id,
              name: l.targetUser.name,
              image: l.targetUser.image,
            }
          : null,
      })),
      total,
    };
  }

  // ─── Admin Action Wrappers ──────────────────────────────────────────

  async adminBanUser(
    adminId: string,
    userId: string,
    banReason?: string,
    banExpiresIn?: number
  ) {
    const result = await auth.api.banUser({
      body: { userId, banReason, banExpiresIn },
    });
    await this.logAdminAction({
      adminId,
      action: AdminAction.BAN_USER,
      targetUserId: userId,
      details: banReason ? `Reason: ${banReason}` : undefined,
    });
    return result;
  }

  async adminUnbanUser(adminId: string, userId: string) {
    const result = await auth.api.unbanUser({ body: { userId } });
    await this.logAdminAction({
      adminId,
      action: AdminAction.UNBAN_USER,
      targetUserId: userId,
    });
    return result;
  }

  async adminSetRole(adminId: string, userId: string, role: string) {
    const result = await auth.api.setRole({
      body: { userId, role: [role as "super_admin" | "support"] as const },
      headers: {}, // provide required headers, or supply appropriate headers if necessary
    });
    await this.logAdminAction({
      adminId,
      action: AdminAction.SET_ROLE,
      targetUserId: userId,
      details: `New role: ${role}`,
    });
    return result;
  }

  async adminRemoveUser(adminId: string, userId: string) {
    const result = await auth.api.removeUser({ body: { userId } });
    await this.logAdminAction({
      adminId,
      action: AdminAction.REMOVE_USER,
      targetUserId: userId,
    });
    return result;
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
