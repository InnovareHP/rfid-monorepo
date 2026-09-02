import {
  AdminUserCreateStreamEvent,
  CONTRACT_STATUS,
  statusesForAccess,
  SUBSCRIPTION_ACCESS_LEVELS,
  CONTRACT_UNPAID_STATUS,
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
import { renderEmailHtml } from "src/lib/aws/ses";
import { emailQueue } from "src/lib/queue/email-queue";
import { prisma } from "src/lib/prisma/prisma";
import { runUnscoped } from "src/lib/prisma/tenant-context";
import { issueContractInvoice } from "src/lib/stripe/contract-invoice";
import { stripe } from "src/lib/stripe/stripe";
import { v4 as uuidv4 } from "uuid";
import { appConfig } from "src/config/app-config";
import { MemberWelcomeEmail } from "src/react-email/member-welcome-email";
import { AdminEntitlementData, CreateAdminUserData } from "./dto/user.dto";
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

  // Support-side provisioning. Same two rows self-serve signup ends with, in
  // the same order, minus the credential: the account holds none, so the owner
  // enrols their own passkey from the login page.
  async *createAdminUser(
    dto: CreateAdminUserData,
    admin: { id: string; name: string }
  ): AsyncGenerator<AdminUserCreateStreamEvent> {
    const { email, name, organizationName } = dto;
    const slug = toSlug(organizationName);

    yield { type: "progress", step: "checking", label: "Checking the email" };

    const existingUser = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException(
        "An account already exists for this email."
      );
    }

    const existingOrg = await runUnscoped(() =>
      prisma.organization.findFirst({ where: { slug }, select: { id: true } })
    );
    if (existingOrg) {
      throw new BadRequestException(
        `An organization named "${organizationName}" already exists.`
      );
    }

    yield {
      type: "progress",
      step: "creating-user",
      label: "Creating the account",
    };

    const user = await prisma.user.create({
      // The admin vouched for the address, and the welcome email is the proof
      // of delivery: an unverified owner cannot receive an invitation either.
      data: { email, name, emailVerified: true },
      select: { id: true },
    });

    yield {
      type: "progress",
      step: "creating-org",
      label: "Creating the organization",
    };

    const organization = await this.createOrganizationFor(user.id, {
      name: organizationName,
      slug,
    });

    yield {
      type: "progress",
      step: "saving-profile",
      label: "Marking the account onboarded",
    };

    // Onboarded, or the guard sends them through the wizard and they end up
    // with a second organization on first sign-in.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnboarded: true,
        onboarding: {
          create: {
            id: uuidv4(),
            hearAbout: "Created by support",
            howToUse: "",
            whatToExpect: "",
          },
        },
      },
      select: { id: true },
    });

    yield {
      type: "progress",
      step: "sending-welcome",
      label: "Emailing the owner",
    };

    const html = await renderEmailHtml(
      MemberWelcomeEmail({
        email,
        organizationName,
        role: ROLES.OWNER,
        loginUrl: `${appConfig.WEBSITE_URL}/login`,
      })
    );
    await emailQueue.add("send", {
      to: email,
      subject: `Your ${appConfig.APP_NAME} account is ready`,
      html,
      from: `${appConfig.APP_EMAIL}`,
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name,
        action: AdminAction.CREATE_USER,
        targetUserId: user.id,
        targetName: name,
        targetOrgId: organization.id,
        details: `Created ${email} as owner of ${organizationName}`,
      },
    });

    yield { type: "done", userId: user.id, organizationId: organization.id };
  }

  // Called with no headers, which is how Better Auth recognises a system action
  // and makes the named user the owner. A failure here would otherwise leave an
  // account with no organization behind it, so the user row goes with it.
  private async createOrganizationFor(
    userId: string,
    org: { name: string; slug: string }
  ) {
    try {
      const organization = await auth.api.createOrganization({
        body: {
          name: org.name,
          slug: org.slug,
          metadata: { user_id: userId },
          userId,
          keepCurrentActiveOrganization: true,
        },
      });
      if (!organization) throw new Error("Failed to create organization");
      return organization;
    } catch (error) {
      await prisma.user.delete({ where: { id: userId } });
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Failed to create the organization"
      );
    }
  }

  async getAdminUsers(params: {
    page: number;
    take: number;
    search?: string;
    roleFilter?: string;
    statusFilter?: string;
    verifiedFilter?: string;
    membershipFilter?: string;
  }) {
    const {
      page,
      take,
      search,
      roleFilter,
      statusFilter,
      verifiedFilter,
      membershipFilter,
    } = params;
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
      // An unrecognised value filters nothing rather than erroring: these
      // arrive as raw query strings.
      ...(statusFilter === "banned" ? { banned: true } : {}),
      ...(statusFilter === "active" ? { banned: false } : {}),
      ...(verifiedFilter === "verified" ? { emailVerified: true } : {}),
      ...(verifiedFilter === "unverified" ? { emailVerified: false } : {}),
      // A signup that never finished onboarding belongs to no organization,
      // which is the only way to find those.
      ...(membershipFilter === "with-org" ? { members: { some: {} } } : {}),
      ...(membershipFilter === "no-org" ? { members: { none: {} } } : {}),
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
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, take, actionFilter, adminId, search, startDate, endDate } =
      params;
    const skip = (page - 1) * take;

    const where: Prisma.AdminActivityLogWhereInput = {
      ...(actionFilter ? { action: actionFilter as AdminAction } : {}),
      ...(adminId ? { adminId } : {}),
      // Names, not ids: the row keeps the name so a deleted account is still
      // searchable, and details is where a reason or a contract label lands.
      ...(search
        ? {
            OR: [
              {
                targetName: { contains: search, mode: "insensitive" as const },
              },
              { adminName: { contains: search, mode: "insensitive" as const } },
              { details: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
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

  // Subscriptions live in their own schema keyed by referenceId, with no
  // relation to filter through, so the matching organizations are resolved
  // first and the list narrows to them.
  private async organizationIdsForBilling(filters: {
    accessFilter?: string;
    contractFilter?: string;
  }) {
    const { accessFilter, contractFilter } = filters;
    const access = SUBSCRIPTION_ACCESS_LEVELS.find(
      (level) => level === accessFilter
    );

    if (!access && accessFilter !== "none" && !contractFilter) return null;

    const rows = await prisma.subscription.findMany({
      where: {
        ...(access ? { status: { in: statusesForAccess(access) } } : {}),
        ...(contractFilter === "custom" ? { isCustom: true } : {}),
        ...(contractFilter === "plan" ? { isCustom: false } : {}),
      },
      select: { referenceId: true },
    });
    const ids = [...new Set(rows.map((row) => row.referenceId))];

    // "none" is the inverse: every organization Stripe has never billed.
    return accessFilter === "none" ? { notIn: ids } : { in: ids };
  }

  async getAdminOrganizations(params: {
    page: number;
    take: number;
    search?: string;
    hipaaOnly?: boolean;
    accessFilter?: string;
    contractFilter?: string;
  }) {
    const { page, take, search, hipaaOnly, accessFilter, contractFilter } =
      params;
    const skip = (page - 1) * take;

    const billingIds = await this.organizationIdsForBilling({
      accessFilter,
      contractFilter,
    });

    const where: Prisma.OrganizationWhereInput = {
      ...(hipaaOnly ? { hipaaEnabled: true } : {}),
      ...(billingIds ? { id: billingIds } : {}),
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
      select: { id: true, isCustom: true, stripeCustomerId: true },
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

    // Only the transition into a contract bills. An org that already held one
    // is being edited - seats corrected, a feature added - and re-invoicing on
    // every save would bill the customer again for a period they have paid.
    // Later periods are a renewal job's problem, not this endpoint's.
    if (contract && !subscription.isCustom) {
      const owes = await this.billContract(
        orgId,
        subscription.stripeCustomerId,
        contract
      );

      if (owes) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: CONTRACT_UNPAID_STATUS },
        });
      }
    }

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
  // Access is granted by the row, not by the payment: a Stripe failure must not
  // leave an organization locked out of a contract that was agreed, so it is
  // logged and the grant stands.
  private async billContract(
    organizationId: string,
    customerId: string,
    contract: NonNullable<AdminEntitlementData["contract"]>
  ) {
    try {
      const invoice = await issueContractInvoice({
        customerId,
        organizationId,
        label: contract.label,
        priceCents: contract.priceCents,
        setupFeeCents: contract.setupFeeCents,
        billingInterval: contract.billingInterval,
      });

      return Boolean(invoice);
    } catch (error) {
      new Logger(UserService.name).error(
        `Contract invoice failed for ${organizationId}`,
        error as Error
      );

      // Access still turns on whether the contract is chargeable, not on
      // whether Stripe answered: a lost invoice must not hand out a free one.
      return contract.priceCents > 0 || contract.setupFeeCents > 0;
    }
  }

  // Editing an entitlement must not bill, so issuing a later period's invoice
  // is a separate deliberate action. This is also what a renewal job will call.
  async issueAdminContractInvoice(
    adminId: string,
    adminName: string,
    orgId: string
  ) {
    const subscription = await prisma.subscription.findFirst({
      where: { referenceId: orgId, isCustom: true },
      select: {
        id: true,
        contractLabel: true,
        seats: true,
        customPriceCents: true,
        setupFeeCents: true,
        billingInterval: true,
        stripeCustomerId: true,
      },
    });

    if (!subscription) {
      throw new BadRequestException("Organization is not on a contract");
    }

    if (!subscription.customPriceCents && !subscription.setupFeeCents) {
      throw new BadRequestException("This contract has nothing to invoice");
    }

    // Two open invoices for one period is a support ticket, so the existing one
    // has to be settled or voided in Stripe before another is raised.
    const open = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      status: "open",
      limit: 1,
    });

    if (open.data.length) {
      throw new BadRequestException(
        "An invoice is already outstanding for this organization"
      );
    }

    let invoice: Awaited<ReturnType<typeof issueContractInvoice>>;

    try {
      invoice = await issueContractInvoice({
        customerId: subscription.stripeCustomerId,
        organizationId: orgId,
        label: subscription.contractLabel ?? "Contract",
        priceCents: subscription.customPriceCents ?? 0,
        // The setup fee belongs to the first invoice only, and this route
        // raises later ones.
        setupFeeCents: 0,
        billingInterval: subscription.billingInterval ?? "annual",
      });
    } catch (error) {
      // Stripe's message names the actual problem - an unconfigured payment
      // method, a deleted customer - and the admin is the person who can fix
      // it. Swallowing it into a 500 wastes that.
      const message =
        error instanceof Error ? error.message : "Stripe rejected the invoice";

      new Logger(UserService.name).error(
        `Contract invoice failed for ${orgId}`,
        error as Error
      );

      throw new BadRequestException(message);
    }

    const organization = await runUnscoped(() =>
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      })
    );

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        adminName,
        action: AdminAction.SET_ENTITLEMENT,
        targetOrgId: orgId,
        targetName: organization?.name ?? orgId,
        details: `Issued contract invoice for ${formatCents(
          subscription.customPriceCents ?? 0
        )}`,
      },
    });

    return {
      invoiceId: invoice?.invoiceId ?? null,
      hostedInvoiceUrl: invoice?.hostedInvoiceUrl ?? null,
    };
  }

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
        id: true,
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

    const owes = await this.billContract(organization.id, customerId, contract);

    if (owes) {
      await prisma.subscription.update({
        where: { id: created.id },
        data: { status: CONTRACT_UNPAID_STATUS },
      });
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
