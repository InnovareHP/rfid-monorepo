import { Injectable, NotFoundException } from "@nestjs/common";
import { AdminAction, Prisma } from "@prisma/client";
import { auth } from "src/lib/auth/auth";
import { prisma } from "src/lib/prisma/prisma";
import { v4 as uuidv4 } from "uuid";
import { OnboardingDto } from "./dto/user.schema";

@Injectable()
export class UserService {
  async onboarding(onboardDto: OnboardingDto, userId: string) {
    const user = await prisma.user_table.update({
      where: {
        id: userId,
      },
      data: {
        user_image: onboardDto.profilePhoto,
        user_is_onboarded: true,
        user_onboarding_table: {
          upsert: {
            create: {
              user_onboarding_id: uuidv4(),
              user_onboarding_hear_about: onboardDto.foundUsOn,
              user_onboarding_how_to_use: onboardDto.purpose,
              user_onboarding_what_to_expect: onboardDto.interests.join(","),
            },
            update: {
              user_onboarding_hear_about: onboardDto.foundUsOn,
              user_onboarding_how_to_use: onboardDto.purpose,
              user_onboarding_what_to_expect: onboardDto.interests.join(","),
            },
          },
        },
      },
      select: {
        user_account_tables: {
          select: {
            user_account_account_id: true,
            user_account_provider_id: true,
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

    const where: Prisma.user_tableWhereInput = {
      ...(search
        ? {
            OR: [
              { user_name: { contains: search, mode: "insensitive" as const } },
              {
                user_email: { contains: search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
      ...(roleFilter ? { user_role: roleFilter } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user_table.findMany({
        where,
        skip,
        take,
        orderBy: { user_created_at: "desc" },
        select: {
          id: true,
          user_name: true,
          user_email: true,
          user_image: true,
          user_role: true,
          user_is_banned: true,
          user_ban_reason: true,
          user_ban_expires: true,
          user_email_verified: true,
          user_created_at: true,
          member_tables: {
            select: {
              id: true,
              member_role: true,
              member_created_at: true,
              organization_table: {
                select: {
                  id: true,
                  organization_name: true,
                  organization_slug: true,
                  organization_logo: true,
                },
              },
            },
          },
        },
      }),
      prisma.user_table.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.user_name,
        email: u.user_email,
        image: u.user_image,
        role: u.user_role,
        banned: u.user_is_banned,
        banReason: u.user_ban_reason,
        banExpires: u.user_ban_expires ? u.user_ban_expires.getTime() : null,
        emailVerified: u.user_email_verified,
        createdAt: u.user_created_at.toISOString(),
        organizations: u.member_tables.map((m) => ({
          id: m.organization_table.id,
          name: m.organization_table.organization_name,
          slug: m.organization_table.organization_slug,
          logo: m.organization_table.organization_logo,
          memberRole: m.member_role,
          memberSince: m.member_created_at.toISOString(),
        })),
      })),
      total,
    };
  }

  async getAdminUserById(userId: string) {
    const u = await prisma.user_table.findUnique({
      where: { id: userId },
      select: {
        id: true,
        user_name: true,
        user_email: true,
        user_image: true,
        user_role: true,
        user_is_banned: true,
        user_ban_reason: true,
        user_ban_expires: true,
        user_email_verified: true,
        user_created_at: true,
        member_tables: {
          select: {
            id: true,
            member_role: true,
            member_created_at: true,
            organization_table: {
              select: {
                id: true,
                organization_name: true,
                organization_slug: true,
                organization_logo: true,
              },
            },
          },
        },
      },
    });

    if (!u) throw new NotFoundException("User not found");

    return {
      id: u.id,
      name: u.user_name,
      email: u.user_email,
      image: u.user_image,
      role: u.user_role,
      banned: u.user_is_banned,
      banReason: u.user_ban_reason,
      banExpires: u.user_ban_expires ? u.user_ban_expires.getTime() : null,
      emailVerified: u.user_email_verified,
      createdAt: u.user_created_at.toISOString(),
      organizations: u.member_tables.map((m) => ({
        id: m.organization_table.id,
        name: m.organization_table.organization_name,
        slug: m.organization_table.organization_slug,
        logo: m.organization_table.organization_logo,
        memberRole: m.member_role,
        memberSince: m.member_created_at.toISOString(),
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
    return prisma.admin_activity_log.create({
      data: {
        admin_id: params.adminId,
        action: params.action,
        target_user_id: params.targetUserId,
        target_org_id: params.targetOrgId,
        details: params.details,
        ip_address: params.ipAddress,
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

    const where: Prisma.admin_activity_logWhereInput = {
      ...(actionFilter ? { action: actionFilter as AdminAction } : {}),
      ...(startDate || endDate
        ? {
            created_at: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.admin_activity_log.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
          admin_user: {
            select: { id: true, user_name: true, user_image: true },
          },
          target_user: {
            select: { id: true, user_name: true, user_image: true },
          },
        },
      }),
      prisma.admin_activity_log.count({ where }),
    ]);

    return {
      logs: logs.map((l) => ({
        id: l.id,
        createdAt: l.created_at.toISOString(),
        action: l.action,
        details: l.details,
        targetOrgId: l.target_org_id,
        admin: {
          id: l.admin_user.id,
          name: l.admin_user.user_name,
          image: l.admin_user.user_image,
        },
        targetUser: l.target_user
          ? {
              id: l.target_user.id,
              name: l.target_user.user_name,
              image: l.target_user.user_image,
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

    const where: Prisma.organization_tableWhereInput = search
      ? {
          OR: [
            {
              organization_name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              organization_slug: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    const [orgs, total] = await Promise.all([
      prisma.organization_table.findMany({
        where,
        skip,
        take,
        orderBy: { organization_created_at: "desc" },
        select: {
          id: true,
          organization_name: true,
          organization_slug: true,
          organization_logo: true,
          organization_created_at: true,
          organization_metadata: true,
          _count: { select: { member_tables: true } },
        },
      }),
      prisma.organization_table.count({ where }),
    ]);

    // Look up subscriptions for these orgs
    const orgIds = orgs.map((o) => o.id);
    const subscriptions = await prisma.subscription_table.findMany({
      where: { subscription_reference_id: { in: orgIds } },
      select: {
        subscription_reference_id: true,
        subscription_plan: true,
        subscription_status: true,
      },
    });
    const subMap = new Map(
      subscriptions.map((s) => [s.subscription_reference_id, s])
    );

    return {
      organizations: orgs.map((o) => {
        const sub = subMap.get(o.id);
        return {
          id: o.id,
          name: o.organization_name,
          slug: o.organization_slug,
          logo: o.organization_logo,
          createdAt: o.organization_created_at.toISOString(),
          metadata: o.organization_metadata,
          memberCount: o._count.member_tables,
          subscriptionStatus: sub?.subscription_status ?? null,
          subscriptionPlan: sub?.subscription_plan ?? null,
        };
      }),
      total,
    };
  }

  async getAdminOrganizationById(orgId: string) {
    const org = await prisma.organization_table.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        organization_name: true,
        organization_slug: true,
        organization_logo: true,
        organization_created_at: true,
        organization_metadata: true,
        member_tables: {
          select: {
            id: true,
            member_role: true,
            member_created_at: true,
            user_table: {
              select: {
                id: true,
                user_name: true,
                user_email: true,
                user_image: true,
                user_is_banned: true,
              },
            },
          },
          orderBy: { member_created_at: "asc" },
        },
      },
    });

    if (!org) throw new NotFoundException("Organization not found");

    const subscription = await prisma.subscription_table.findFirst({
      where: { subscription_reference_id: orgId },
    });

    return {
      id: org.id,
      name: org.organization_name,
      slug: org.organization_slug,
      logo: org.organization_logo,
      createdAt: org.organization_created_at.toISOString(),
      metadata: org.organization_metadata,
      members: org.member_tables.map((m) => ({
        memberId: m.id,
        role: m.member_role,
        joinedAt: m.member_created_at.toISOString(),
        user: {
          id: m.user_table.id,
          name: m.user_table.user_name,
          email: m.user_table.user_email,
          image: m.user_table.user_image,
          banned: m.user_table.user_is_banned,
        },
      })),
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.subscription_plan,
            status: subscription.subscription_status,
            periodStart:
              subscription.subscription_period_start?.toISOString() ?? null,
            periodEnd:
              subscription.subscription_period_end?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.subscription_cancel_at_period_end,
            seats: subscription.subscription_seats,
            trialStart:
              subscription.subscription_trial_start?.toISOString() ?? null,
            trialEnd:
              subscription.subscription_trial_end?.toISOString() ?? null,
            cancelAt:
              subscription.subscription_cancel_at?.toISOString() ?? null,
          }
        : null,
    };
  }
}
