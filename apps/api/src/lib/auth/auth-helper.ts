import {
  formatCapitalize,
  isConsumerEmailDomain,
  resolveEntitlement,
  WORK_EMAIL_REQUIRED_MESSAGE,
} from "@dashboard/shared";
import { Logger } from "@nestjs/common";
import {
  cacheData,
  deleteData,
  getData,
  purgeAllCacheKeys,
} from "../redis/redis";
import { APIError } from "better-auth/api";
import { User } from "better-auth";
import { ReferralDashboardEmail } from "src/react-email/confirmation-email";
import { appConfig } from "../../config/app-config";
import { InvitationEmail } from "../../react-email/invitation-email";
import { InvitationResponseEmail } from "../../react-email/invitation-response-email";
import { MemberWelcomeEmail } from "../../react-email/member-welcome-email";
import { PasswordChangedEmail } from "../../react-email/password-changed-email";
import { ResetPasswordEmail } from "../../react-email/reset-password-email";
import { TwoFactorOtpEmail } from "../../react-email/two-factor-otp-email";
import { renderEmailHtml } from "../aws/ses";
import { prisma } from "../prisma/prisma";
import { emailQueue } from "../queue/email-queue";
import { OnboardingSeeding } from "./onboarding";

const logger = new Logger("org-hook");

export const beforeSessionCreate = async (session: {
  userId: string;
  [key: string]: any;
}) => {
  const organization = await prisma.user.findFirst({
    where: { id: session.userId },
    select: {
      members: {
        select: { organizationId: true, role: true, id: true },
        take: 1,
      },
    },
  });

  const activeOrganizationId = organization?.members[0]?.organizationId;
  return {
    data: {
      ...session,
      memberRole: organization?.members[0]?.role,
      memberId: organization?.members[0]?.id,
      activeOrganizationId,
    },
  };
};

export interface ResolvedSessionMembership {
  role: string | null;
  memberId: string | null;
  activeOrganizationId: string | null;
}

export const resolveSessionMembership = async (
  userId: string,
  activeOrganizationId?: string | null
): Promise<ResolvedSessionMembership> => {
  const member = await prisma.member.findFirst({
    where: {
      userId,
      ...(activeOrganizationId ? { organizationId: activeOrganizationId } : {}),
    },
    select: { id: true, organizationId: true, role: true },
  });

  return {
    role: member?.role ?? null,
    memberId: member?.id ?? null,
    activeOrganizationId:
      member?.organizationId ?? activeOrganizationId ?? null,
  };
};

// customSession runs on every getSession(), and the AuthGuard calls that once
// per guarded request, so this handler's three queries were being paid by every
// endpoint before its own work started. The org-scoped half is cached; the
// session and user still come from Better Auth on each call.
const SESSION_CONTEXT_TTL_SECONDS = 30;

// Organization first so a role change can purge the whole organization with
// the shared prefix helper.
const sessionContextKey = (organizationId: string, userId: string) =>
  `session-context:${organizationId}:${userId}`;

type CachedSessionContext = {
  membership: ResolvedSessionMembership;
  member: {
    id: string;
    role: string | null;
    organizationId: string;
  } | null;
  organization: unknown;
  subscription: unknown;
};

export const invalidateSessionContext = (
  organizationId: string,
  userId: string
) => deleteData(sessionContextKey(organizationId, userId));

// Membership drives the role every permission check reads, so a role change
// drops every cached context for that organization, not just one user's.
export const invalidateOrganizationSessionContext = (organizationId: string) =>
  purgeAllCacheKeys(`session-context:${organizationId}`);

export const customSessionHandler = async ({
  user,
  session,
}: {
  user: Record<string, any>;
  session: Record<string, any>;
}) => {
  const requestedOrganizationId = (session as { activeOrganizationId?: string })
    .activeOrganizationId;

  if (requestedOrganizationId) {
    const cached = (await getData(
      sessionContextKey(requestedOrganizationId, user.id)
    )) as CachedSessionContext | null;

    if (cached) {
      return {
        user,
        session: {
          ...session,
          ...cached.membership,
          memberRole: cached.membership.role,
        },
        member: cached.member,
        organization: cached.organization,
        subscription: cached.subscription,
      };
    }
  }

  const membership = await resolveSessionMembership(
    user.id,
    (session as { activeOrganizationId?: string }).activeOrganizationId
  );

  const activeOrganizationId = membership.activeOrganizationId;
  const mergedSession = {
    ...session,
    ...membership,
    memberRole: membership.role,
  };

  if (!activeOrganizationId) {
    return {
      user,
      session: mergedSession,
      member: null,
      organization: null,
      subscription: null,
    };
  }

  const member = membership.memberId
    ? {
        id: membership.memberId,
        role: membership.role,
        organizationId: activeOrganizationId,
      }
    : null;

  const [organization, subscription] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: activeOrganizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        metadata: true,
        createdAt: true,
      },
    }),
    // Whatever its status, and ordered the same way the subscription guard
    // orders it: filtering to live rows here would hand the client the same
    // null for a canceled organization as for one that never subscribed, and
    // the two need different screens.
    prisma.subscription.findFirst({
      where: { referenceId: activeOrganizationId },
      orderBy: { periodEnd: "desc" },
    }),
  ]);

  await cacheData(
    sessionContextKey(activeOrganizationId, user.id),
    { membership, member, organization, subscription },
    SESSION_CONTEXT_TTL_SECONDS
  );

  return { user, session: mergedSession, member, organization, subscription };
};

export const beforeSessionUpdate = async (
  session: MemberSession["session"]
) => {
  const member = await prisma.member.findFirst({
    where: {
      userId: session.userId,
      organizationId: session.activeOrganizationId,
    },
    select: { organizationId: true, role: true, id: true },
  });

  return {
    data: {
      ...session,
      memberRole: member?.role,
      memberId: member?.id,
    },
  };
};

// ─── Email functions ───────────────────────────────────────────────

export const sendVerificationEmail = async ({
  url,
  user,
  token,
}: {
  url: string;
  user: { name: string; email: string };
  token: string;
}) => {
  const tokenUrl = `${url}?token=${token}`;
  const html = await renderEmailHtml(
    ReferralDashboardEmail({
      magicLink: tokenUrl,
      name: user.name,
    })
  );
  await emailQueue.add("send", {
    to: user.email,
    subject: `Verify your ${appConfig.APP_NAME} account`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

// Two-factor codes are emailed, so no authenticator app is ever required.
export const sendTwoFactorOtp = async ({
  user,
  otp,
}: {
  user: { email: string };
  otp: string;
}) => {
  const html = await renderEmailHtml(
    TwoFactorOtpEmail({ validationCode: otp })
  );
  await emailQueue.add("send", {
    to: user.email,
    subject: `Your ${appConfig.APP_NAME} verification code`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

export const sendResetPassword = async ({
  user,
  url,
  token,
}: {
  user: { name: string; email: string };
  url: string;
  token: string;
}) => {
  const tokenUrl = `${url}?token=${token}`;
  const html = await renderEmailHtml(
    ResetPasswordEmail({
      magicLink: tokenUrl,
      name: user.name,
    })
  );
  await emailQueue.add("send", {
    to: user.email,
    subject: "Reset your password",
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

// Fires after the reset lands, so this is the notice that tells a user their
// password changed when it was not them who changed it.
export const onPasswordReset = async ({
  user,
}: {
  user: { email: string; name?: string };
}) => {
  const html = await renderEmailHtml(
    PasswordChangedEmail({
      resetUrl: `${appConfig.WEBSITE_URL}/reset-password`,
      name: user.name,
    })
  );
  await emailQueue.add("send", {
    to: user.email,
    subject: `Your ${appConfig.APP_NAME} password was changed`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

export const sendMagicLink = async ({
  user,
  url,
  token,
}: {
  user: User;
  url: string;
  token: string;
}) => {
  const tokenUrl = `${url}?token=${token}`;
  const html = await renderEmailHtml(
    ReferralDashboardEmail({
      magicLink: tokenUrl,
    })
  );
  await emailQueue.add("send", {
    to: user.email,
    subject: `Login to your ${appConfig.APP_NAME} account`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

// ─── Organization lifecycle hooks ──────────────────────────────────

export const beforeCreateOrganization = async ({
  organization,
}: {
  organization: any;
  user: any;
}) => {
  return {
    data: {
      ...organization,
      activeOrganizationId: organization.id,
    },
  };
};

export const afterCreateOrganization = async ({
  organization,
}: {
  organization: { id: string };
}) => {
  await OnboardingSeeding(organization.id);
};

export const beforeUpdateOrganization = async ({
  organization,
}: {
  organization: any;
}) => {
  return {
    data: {
      name: organization.name?.toLowerCase(),
      ...(organization.logo !== undefined && { logo: organization.logo }),
      ...(organization.metadata !== undefined && {
        metadata: organization.metadata,
      }),
    },
  };
};

export const beforeDeleteOrganization = async ({
  organization,
}: {
  organization: { id: string };
}) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: organization.id,
      status: { in: ["active", "trialing"] },
    },
  });
  if (subscription) {
    throw new Error(
      "Cannot delete organization with an active subscription. Cancel the subscription first."
    );
  }
};

// Better Auth passes the deleted organization, which nothing here reads. A
// function taking fewer parameters still satisfies the hook's type.
export const afterDeleteOrganization = async () => {
  // Board-schema children are removed automatically via `onDelete: Cascade`
  // on the Organization relations (Field, Board, Activity, BoardCounty) and
  // their downstream cascades. No manual cleanup required.
};

// ─── Member lifecycle hooks ────────────────────────────────────────

// HIPAA mode is the signal, not the plan name: it is only reachable with the
// hipaa entitlement and an executed BAA, and it is the point from which PHI
// protections are promised. An organization that has not turned it on keeps
// whatever addresses it likes.
const assertWorkEmailIfHipaa = async (
  organizationId: string,
  email: string | null | undefined
) => {
  if (!email || !isConsumerEmailDomain(email)) return;

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { hipaaEnabled: true },
  });

  if (organization?.hipaaEnabled) {
    throw new APIError("BAD_REQUEST", { message: WORK_EMAIL_REQUIRED_MESSAGE });
  }
};

export const beforeAddMember = async ({
  member,
  organization,
}: {
  member: any;
  organization: { id: string };
}) => {
  const [memberCount, subscription, user] = await Promise.all([
    prisma.member.count({
      where: { organizationId: organization.id },
    }),
    prisma.subscription.findFirst({
      where: { referenceId: organization.id },
      select: {
        plan: true,
        seats: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: member.userId },
      select: { email: true },
    }),
  ]);

  await assertWorkEmailIfHipaa(organization.id, user?.email);

  // Seats are purchased, so the ceiling is what the organization bought — a
  // negotiated contract carries its own count rather than a tier's.
  const maxSeats = resolveEntitlement(subscription).seats;
  if (memberCount >= maxSeats) {
    throw new Error(
      `Organization has used all ${maxSeats} of its seats. Add seats to invite more members.`
    );
  }

  return { data: member };
};

export const afterAddMember = async ({
  member,
  user,
  organization,
}: {
  member: { role: string };
  user: { email: string };
  organization: { name: string };
}) => {
  // Owners are added when they create the organization — no welcome email.
  if (member.role === "owner") return;

  const html = await renderEmailHtml(
    MemberWelcomeEmail({
      email: user.email,
      organizationName: organization.name,
      role: formatCapitalize(member.role),
      loginUrl: appConfig.WEBSITE_URL,
    })
  );
  await emailQueue.add("send", {
    to: user.email,
    subject: `Welcome to ${organization.name} on ${appConfig.APP_NAME}`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

export const beforeRemoveMember = async ({
  member,
  organization,
}: {
  member: { role: string };
  organization: { id: string };
}) => {
  if (member.role === "owner") {
    const ownerCount = await prisma.member.count({
      where: {
        organizationId: organization.id,
        role: "owner",
      },
    });
    if (ownerCount <= 1) {
      throw new Error(
        "Cannot remove the last owner. Transfer ownership to another member first."
      );
    }
  }
};

export const afterRemoveMember = async ({
  user,
  organization,
}: {
  member: any;
  user: { email: string; id: string };
  organization: { name: string; id: string };
}) => {
  await prisma.bookingPage.updateMany({
    where: { organizationId: organization.id, userId: user.id },
    data: { isActive: false },
  });

  // Ids only: the actor and the affected member are already on the audit row,
  // and stdout is not a place to put a workforce member's address.
  logger.log(`Member ${user.id} removed from organization ${organization.id}`);
};

export const beforeUpdateMemberRole = async ({
  member,
  newRole,
  organization,
}: {
  member: { role: string };
  newRole: string;
  user: any;
  organization: { id: string };
}) => {
  if (member.role === "owner" && newRole !== "owner") {
    const ownerCount = await prisma.member.count({
      where: {
        organizationId: organization.id,
        role: "owner",
      },
    });
    if (ownerCount <= 1) {
      throw new Error(
        "Cannot change the role of the last owner. Assign another owner first."
      );
    }
  }
  return { data: { role: newRole } };
};

export const afterUpdateMemberRole = async ({
  member,
  previousRole,
}: {
  member: { role: string };
  previousRole: string;
  user: { email: string };
  organization: { name: string };
}) => {
  logger.log(`Member role changed from ${previousRole} to ${member.role}`);
};

// ─── Invitation lifecycle hooks ────────────────────────────────────

export const beforeCreateInvitation = async ({
  invitation,
  organization,
}: {
  invitation: any;
  inviter: any;
  organization: { id: string };
}) => {
  const [memberCount, pendingInvitations, subscription] = await Promise.all([
    prisma.member.count({
      where: { organizationId: organization.id },
    }),
    prisma.invitation.count({
      where: {
        organizationId: organization.id,
        status: "pending",
      },
    }),
    prisma.subscription.findFirst({
      where: { referenceId: organization.id },
      select: {
        plan: true,
        seats: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
    }),
  ]);

  await assertWorkEmailIfHipaa(organization.id, invitation.email);

  const maxSeats = resolveEntitlement(subscription).seats;
  if (memberCount + pendingInvitations >= maxSeats) {
    throw new APIError("BAD_REQUEST", {
      message: `Cannot send invitation. All ${maxSeats} seats are taken (${memberCount} members, ${pendingInvitations} pending invitations). Add seats to invite more.`,
    });
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  return {
    data: {
      ...invitation,
      expiresAt,
    },
  };
};

export const beforeAcceptInvitation = async ({
  invitation,
  organization,
}: {
  invitation: { expiresAt: Date };
  user: any;
  organization: { id: string };
}) => {
  if (new Date(invitation.expiresAt) < new Date()) {
    throw new APIError("BAD_REQUEST", {
      message:
        "This invitation has expired. Please ask the organization admin to send a new one.",
    });
  }

  const [memberCount, subscription] = await Promise.all([
    prisma.member.count({
      where: { organizationId: organization.id },
    }),
    prisma.subscription.findFirst({
      where: { referenceId: organization.id },
      select: {
        plan: true,
        seats: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
    }),
  ]);

  const maxSeats = resolveEntitlement(subscription).seats;
  if (memberCount >= maxSeats) {
    throw new APIError("BAD_REQUEST", {
      message:
        "This organization has no seats left. Contact the organization admin.",
    });
  }
};

export const afterAcceptInvitation = async ({
  invitation,
  member,
  user,
  organization,
}: {
  invitation: { inviterId: string };
  member: { role: string };
  user: { email: string };
  organization: { name: string };
}) => {
  const inviter = await prisma.user.findFirst({
    where: { id: invitation.inviterId },
    select: { email: true, name: true },
  });
  if (!inviter) return;

  const html = await renderEmailHtml(
    InvitationResponseEmail({
      inviterName: inviter.name,
      inviteeEmail: user.email,
      organizationName: organization.name,
      response: "accepted",
      role: formatCapitalize(member.role),
    })
  );
  await emailQueue.add("send", {
    to: inviter.email,
    subject: `${user.email} joined ${organization.name}`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

export const afterRejectInvitation = async ({
  invitation,
  user,
  organization,
}: {
  invitation: { inviterId: string };
  user: { email: string };
  organization: { name: string };
}) => {
  const inviter = await prisma.user.findFirst({
    where: { id: invitation.inviterId },
    select: { email: true, name: true },
  });
  if (!inviter) return;

  const html = await renderEmailHtml(
    InvitationResponseEmail({
      inviterName: inviter.name,
      inviteeEmail: user.email,
      organizationName: organization.name,
      response: "declined",
    })
  );
  await emailQueue.add("send", {
    to: inviter.email,
    subject: `${user.email} declined your invitation to ${organization.name}`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

export const afterCancelInvitation = async ({
  invitation,
  cancelledBy,
}: {
  invitation: { id: string };
  cancelledBy: { id: string };
}) => {
  logger.log(`Invitation ${invitation.id} cancelled by ${cancelledBy.id}`);
};

// ─── Team lifecycle hooks ──────────────────────────────────────────

export const beforeCreateTeam = async ({ team }: { team: any }) => {
  return {
    data: {
      ...team,
      name: team.name.toLowerCase().replace(/\s+/g, "-"),
    },
  };
};

export const beforeUpdateTeam = async ({ updates }: { updates: any }) => {
  return {
    data: {
      ...updates,
      name: updates.name?.toLowerCase().replace(/\s+/g, "-"),
    },
  };
};

// ─── Invitation email sender ───────────────────────────────────────

export const sendInvitationEmail = async (data: {
  email: string;
  organization: { name: string };
  inviter: { user: { name: string } };
  invitation: { id: string };
}) => {
  const html = await renderEmailHtml(
    InvitationEmail({
      invitation: {
        email: data.email,
        organizationName: data.organization.name,
        inviterName: data.inviter.user.name,
        inviteLink: `${appConfig.WEBSITE_URL}/invitation/accept?token=${data.invitation.id}`,
        rejectLink: `${appConfig.WEBSITE_URL}/invitation/reject?token=${data.invitation.id}`,
      },
    })
  );
  await emailQueue.add("send", {
    to: data.email,
    subject: `You've been invited to join ${data.organization.name} on ${appConfig.APP_NAME}`,
    html,
    from: `${appConfig.APP_EMAIL}`,
  });
};

// ─── Stripe authorization helpers ──────────────────────────────────

export const stripeAuthorizeReference = async ({
  user,
  referenceId,
}: {
  user: { id: string };
  referenceId: string;
}) => {
  const member = await prisma.member.findFirst({
    where: {
      userId: user.id,
      organizationId: referenceId,
    },
  });
  return member?.role === "owner";
};

export const subscriptionAuthorizeReference = async ({
  session,
  action,
}: {
  session: Record<string, any>;
  action: string;
}) => {
  if (
    action === "upgrade-subscription" ||
    action === "cancel-subscription" ||
    action === "restore-subscription"
  ) {
    const org = await prisma.member.findFirst({
      where: { id: session.memberId },
      select: { role: true },
    });
    return org?.role === "owner";
  }
  return true;
};
