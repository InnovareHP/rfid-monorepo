import {
  formatCapitalize,
  isConsumerEmailDomain,
  resolveEntitlement,
  WORK_EMAIL_REQUIRED_MESSAGE,
} from "@dashboard/shared";
import { User } from "better-auth";
import { ReferralDashboardEmail } from "src/react-email/confirmation-email";
import { appConfig } from "../../config/app-config";
import { InvitationEmail } from "../../react-email/invitation-email";
import { InvitationResponseEmail } from "../../react-email/invitation-response-email";
import { MemberWelcomeEmail } from "../../react-email/member-welcome-email";
import { PasswordChangedEmail } from "../../react-email/password-changed-email";
import { ResetPasswordEmail } from "../../react-email/reset-password-email";
import { renderEmailHtml } from "../aws/ses";
import { prisma } from "../prisma/prisma";
import { emailQueue } from "../queue/email-queue";
import { OnboardingSeeding } from "./onboarding";

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

export const customSessionHandler = async ({
  user,
  session,
}: {
  user: Record<string, any>;
  session: Record<string, any>;
}) => {
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
    prisma.subscription.findFirst({
      where: {
        referenceId: activeOrganizationId,
        status: { in: ["active", "trialing"] },
      },
    }),
  ]);

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

export const afterDeleteOrganization = async ({}: {
  organization: { id: string };
}) => {
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
    throw new Error(WORK_EMAIL_REQUIRED_MESSAGE);
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

  // Seats bill per member, so subscription.seats tracks the current head count
  // and can never be the ceiling. The resolved entitlement is — a negotiated
  // contract carries its own seat count rather than a tier's.
  const maxSeats = resolveEntitlement(subscription).seats;
  if (memberCount >= maxSeats) {
    throw new Error(
      `Organization has reached its plan limit of ${maxSeats} members. Upgrade your plan to add more.`
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

  console.log(
    `[org-hook] Member ${user.email} removed from ${organization.name}`
  );
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
  user,
  organization,
}: {
  member: { role: string };
  previousRole: string;
  user: { email: string };
  organization: { name: string };
}) => {
  console.log(
    `[org-hook] ${user.email} role changed from ${previousRole} to ${member.role} in ${organization.name}`
  );
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
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
    }),
  ]);

  await assertWorkEmailIfHipaa(organization.id, invitation.email);

  const maxSeats = resolveEntitlement(subscription).seats;
  if (memberCount + pendingInvitations >= maxSeats) {
    throw new Error(
      `Cannot send invitation. Organization has reached its plan limit of ${maxSeats} members (${memberCount} members, ${pendingInvitations} pending invitations).`
    );
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
    throw new Error(
      "This invitation has expired. Please ask the organization admin to send a new one."
    );
  }

  const [memberCount, subscription] = await Promise.all([
    prisma.member.count({
      where: { organizationId: organization.id },
    }),
    prisma.subscription.findFirst({
      where: { referenceId: organization.id },
      select: {
        plan: true,
        isCustom: true,
        contractLabel: true,
        customLimits: true,
      },
    }),
  ]);

  const maxSeats = resolveEntitlement(subscription).seats;
  if (memberCount >= maxSeats) {
    throw new Error(
      "This organization has reached its member limit. Contact the organization admin."
    );
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
  console.log(
    `[org-hook] Invitation ${invitation.id} cancelled by ${cancelledBy.id}`
  );
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
