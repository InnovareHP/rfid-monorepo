import {
  CONTRACT_STATUS,
  OnboardingStreamEvent,
  resolveEntitlement,
  ROLES,
  toSlug,
  type SubscriptionLike,
} from "@dashboard/shared";
import {
  BadRequestException,
  Logger,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdminAction, AgreementKind, Prisma } from "@prisma/client";
import { invalidateSubscriptionCache } from "src/guard/subscription/subscription.guard";
import { invalidateOrganizationSessionContext } from "src/lib/auth/session-context";
import { auth } from "src/lib/auth/auth";
import { prisma } from "src/lib/prisma/prisma";
import { runUnscoped } from "src/lib/prisma/tenant-context";
import { issueContractInvoice } from "src/lib/stripe/contract-invoice";
import { stripe } from "src/lib/stripe/stripe";
import { v4 as uuidv4 } from "uuid";
import { AdminEntitlementData } from "./dto/user.dto";
import { OnboardingDto } from "./dto/user.schema";

// Whole dollars unless the contract has cents, which most do not.
const formatCents = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

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
    hipaaOnly?: boolean;
  }) {
    const { page, take, search, hipaaOnly } = params;
    const skip = (page - 1) * take;

    const where: Prisma.OrganizationWhereInput = {
      ...(hipaaOnly ? { hipaaEnabled: true } : {}),
      ...(search
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
        : {}),
    };

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
          hipaaEnabled: true,
          baaAcceptedAt: true,
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
        isCustom: true,
        contractLabel: true,
        customLimits: true,
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
          // The label a contract negotiated, not the tier name it stores.
          entitlementLabel: resolveEntitlement(sub ?? null).label,
          hipaaEnabled: o.hipaaEnabled,
          baaAcceptedAt: o.baaAcceptedAt?.toISOString() ?? null,
        };
      }),
      total,
    };
  }

  // ─── Platform Metrics ───────────────────────────────────────────────

  // Counted in the database rather than by paging rows into the browser, which
  // is what the stats dashboard used to do. Revenue is absent on purpose: the
  // price of a tier lives in Stripe, and a number derived from the local plan
  // table would read as MRR while quietly ignoring discounts and proration.
  async getAdminMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      usersTotal,
      usersBanned,
      superAdmins,
      usersOnboarded,
      usersNew,
      orgsTotal,
      orgsHipaa,
      orgsBaaSigned,
      orgsNew,
      subscriptionsByStatus,
      customContracts,
      trialsExpiringSoon,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.count({ where: { role: ROLES.SUPER_ADMIN } }),
      prisma.user.count({ where: { isOnboarded: true } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.organization.count(),
      prisma.organization.count({ where: { hipaaEnabled: true } }),
      prisma.organization.count({ where: { baaAcceptedAt: { not: null } } }),
      prisma.organization.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.subscription.count({ where: { isCustom: true } }),
      prisma.subscription.count({
        where: {
          status: "trialing",
          trialEnd: { gte: now, lte: inSevenDays },
        },
      }),
    ]);

    return {
      users: {
        total: usersTotal,
        banned: usersBanned,
        superAdmins,
        onboarded: usersOnboarded,
        newLast30Days: usersNew,
      },
      organizations: {
        total: orgsTotal,
        hipaaEnabled: orgsHipaa,
        baaSigned: orgsBaaSigned,
        newLast30Days: orgsNew,
      },
      subscriptions: {
        byStatus: subscriptionsByStatus.map((row) => ({
          status: row.status ?? "unknown",
          count: row._count._all,
        })),
        customContracts,
        trialsExpiringIn7Days: trialsExpiringSoon,
      },
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
        hipaaEnabled: true,
        baaAcceptedAt: true,
        baaVersion: true,
        retentionDays: true,
        stripeCustomerId: true,
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

    const [subscription, agreement] = await Promise.all([
      prisma.subscription.findFirst({ where: { referenceId: orgId } }),
      // Latest executed agreement of any version, so an org sitting on a
      // superseded BAA still shows who signed what and when.
      prisma.contractAgreement.findFirst({
        where: { organizationId: orgId, kind: AgreementKind.BAA },
        orderBy: { signedAt: "desc" },
        select: {
          id: true,
          termsVersion: true,
          signedAt: true,
          signerName: true,
          signerTitle: true,
          signerEmail: true,
          companyLegalName: true,
          acceptanceMethod: true,
          ipAddress: true,
          document: true,
        },
      }),
    ]);

    const entitlement = resolveEntitlement(subscription);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt.toISOString(),
      metadata: org.metadata,
      stripeCustomerId: org.stripeCustomerId,
      compliance: {
        hipaaEnabled: org.hipaaEnabled,
        baaAcceptedAt: org.baaAcceptedAt?.toISOString() ?? null,
        baaVersion: org.baaVersion,
        retentionDays: org.retentionDays,
        // Whether the plan may enable HIPAA at all, which is a separate
        // question from whether this org has.
        planSupportsHipaa: entitlement.features.includes("hipaa"),
        agreement: agreement
          ? {
              termsVersion: agreement.termsVersion,
              signedAt: agreement.signedAt.toISOString(),
              signerName: agreement.signerName,
              signerTitle: agreement.signerTitle,
              signerEmail: agreement.signerEmail,
              companyLegalName: agreement.companyLegalName,
              acceptanceMethod: agreement.acceptanceMethod,
              ipAddress: agreement.ipAddress,
              hasDocument: Boolean(agreement.document),
            }
          : null,
      },
      entitlement: {
        label: entitlement.label,
        seats: entitlement.seats,
        features: entitlement.features,
        isCustom: entitlement.isCustom,
        // Carried so the admin dialog prefills what was negotiated rather than
        // resetting the price to zero every time it opens.
        priceCents: subscription?.customPriceCents ?? null,
        setupFeeCents: subscription?.setupFeeCents ?? null,
        billingInterval: subscription?.billingInterval ?? null,
      },
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

  // Grants or clears a negotiated contract. The Redis entitlement cache is
  // cleared in the same call: without that, a grant sits invisible behind
  // subscription.guard for up to its TTL and reads as a broken feature flag.
  async setAdminOrganizationEntitlement(
    adminId: string,
    adminName: string,
    orgId: string,
    input: AdminEntitlementData
  ) {
    const organization = await runUnscoped(() =>
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, stripeCustomerId: true },
      })
    );
    if (!organization) throw new NotFoundException("Organization not found");

    const subscription = await prisma.subscription.findFirst({
      where: { referenceId: orgId },
      select: { id: true },
      orderBy: { periodEnd: "desc" },
    });

    const { contract } = input;

    // A contract customer never reaches Stripe checkout, so there is no row to
    // hang the grant off and nothing to clear. The row is created here instead
    // of blocking the grant, because waiting on a checkout that will never
    // happen is what left these organizations parked on the billing screen.
    if (!subscription) {
      if (!contract) {
        throw new BadRequestException("Organization has no contract to clear");
      }

      const created = await this.createContractSubscription(
        organization,
        contract
      );

      await this.afterEntitlementChange(
        orgId,
        organization.name,
        adminId,
        adminName,
        contract
      );

      return created;
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: contract
        ? {
            isCustom: true,
            contractLabel: contract.label,
            customLimits: {
              seats: contract.seats,
              features: contract.features,
            },
            seats: contract.seats,
            customPriceCents: contract.priceCents,
            setupFeeCents: contract.setupFeeCents,
            billingInterval: contract.billingInterval,
          }
        : {
            isCustom: false,
            contractLabel: null,
            customLimits: Prisma.DbNull,
            customPriceCents: null,
            setupFeeCents: null,
          },
      select: {
        plan: true,
        status: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
    });

    await this.afterEntitlementChange(
      orgId,
      organization.name,
      adminId,
      adminName,
      contract
    );

    return this.entitlementSummary(updated);
  }

  private entitlementSummary(
    subscription: SubscriptionLike & {
      customPriceCents?: number | null;
      setupFeeCents?: number | null;
      billingInterval?: string | null;
    }
  ) {
    const entitlement = resolveEntitlement(subscription);

    return {
      label: entitlement.label,
      seats: entitlement.seats,
      features: entitlement.features,
      isCustom: entitlement.isCustom,
      priceCents: subscription.customPriceCents ?? null,
      setupFeeCents: subscription.setupFeeCents ?? null,
      billingInterval: subscription.billingInterval ?? null,
    };
  }

  // Both caches are cleared in the same call as the write: without that, a
  // grant sits invisible behind subscription.guard for up to its TTL and reads
  // as a broken feature flag.
  private async afterEntitlementChange(
    orgId: string,
    orgName: string,
    adminId: string,
    adminName: string,
    contract: AdminEntitlementData["contract"]
  ) {
    await invalidateSubscriptionCache(orgId);
    await invalidateOrganizationSessionContext(orgId);

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        adminName,
        action: AdminAction.SET_ENTITLEMENT,
        targetOrgId: orgId,
        targetName: orgName,
        details: contract
          ? `${contract.label}: ${contract.seats} seats, ${formatCents(
              contract.priceCents
            )} ${contract.billingInterval}${
              contract.setupFeeCents
                ? ` plus ${formatCents(contract.setupFeeCents)} setup`
                : ""
            }, features [${contract.features.join(", ")}]`
          : "Cleared custom contract, reverted to plan tier",
      },
    });
  }

  // A contract organization has never been to checkout, so it has no Stripe
  // customer either. One is created here so the invoice has somewhere to go and
  // so billing history, which reads the same column, has something to list.
  private async createContractSubscription(
    organization: { id: string; name: string; stripeCustomerId: string | null },
    contract: NonNullable<AdminEntitlementData["contract"]>
  ) {
    let customerId = organization.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: organization.name,
        metadata: { organizationId: organization.id },
      });
      customerId = customer.id;

      await runUnscoped(() =>
        prisma.organization.update({
          where: { id: organization.id },
          data: { stripeCustomerId: customerId },
        })
      );
    }

    const created = await prisma.subscription.create({
      data: {
        // Never read while isCustom holds valid limits, but the column is
        // required and "custom" is the honest value.
        plan: "custom",
        referenceId: organization.id,
        stripeCustomerId: customerId,
        status: CONTRACT_STATUS,
        isCustom: true,
        contractLabel: contract.label,
        customLimits: {
          seats: contract.seats,
          features: contract.features,
        },
        seats: contract.seats,
        customPriceCents: contract.priceCents,
        setupFeeCents: contract.setupFeeCents,
        billingInterval: contract.billingInterval,
      },
      select: {
        plan: true,
        status: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
        seats: true,
        customPriceCents: true,
        setupFeeCents: true,
        billingInterval: true,
      },
    });

    // Access is granted by the row above; the invoice is a consequence, not a
    // precondition. A Stripe failure must not leave the organization locked out
    // of a contract that was agreed, so it is logged and the grant stands.
    try {
      await issueContractInvoice({
        customerId: customerId,
        organizationId: organization.id,
        label: contract.label,
        priceCents: contract.priceCents,
        setupFeeCents: contract.setupFeeCents,
        billingInterval: contract.billingInterval,
      });
    } catch (error) {
      new Logger(UserService.name).error(
        `Contract invoice failed for ${organization.id}`,
        error as Error
      );
    }

    return this.entitlementSummary(created);
  }

  // Serves whichever BAA version the org last executed, not only the current
  // one, because oversight has to read what was actually signed.
  async getAdminOrganizationBaa(orgId: string) {
    const agreement = await prisma.contractAgreement.findFirst({
      where: { organizationId: orgId, kind: AgreementKind.BAA },
      orderBy: { signedAt: "desc" },
      select: { document: true, termsVersion: true },
    });

    if (!agreement?.document) {
      throw new NotFoundException(
        "No executed agreement for this organization"
      );
    }

    return {
      document: Buffer.from(agreement.document),
      termsVersion: agreement.termsVersion,
    };
  }
}
