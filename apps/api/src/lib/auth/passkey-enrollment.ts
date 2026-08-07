import { appConfig } from "../../config/app-config";
import { PasskeyEnrolledEmail } from "../../react-email/passkey-enrolled-email";
import { renderEmailHtml } from "../aws/ses";
import { prisma } from "../prisma/prisma";
import { emailQueue } from "../queue/email-queue";

// A synced passkey can still be shared through a vault, so sharing is detected
// by device count rather than by login.
export const MAX_PASSKEYS_PER_USER = 5;

export const countPasskeys = (userId: string) =>
  prisma.passkey.count({ where: { userId } });

export const assertPasskeyCapacity = async (userId: string) => {
  const count = await countPasskeys(userId);
  if (count >= MAX_PASSKEYS_PER_USER) {
    throw new Error(
      `This account already has the maximum of ${MAX_PASSKEYS_PER_USER} passkeys. Remove one before adding another.`
    );
  }
};

// The owner is not party to the sharing, so the alert reaches someone with a
// reason to act. Best effort: a notification failure must not fail an
// enrollment the user already completed on their device.
export const notifyOwnerOfEnrollment = async (args: {
  userId: string;
  deviceLabel: string;
}) => {
  try {
    const [user, deviceCount] = await Promise.all([
      prisma.user.findFirst({
        where: { id: args.userId },
        select: {
          email: true,
          members: {
            select: {
              organizationId: true,
              organization: { select: { name: true } },
            },
            take: 1,
          },
        },
      }),
      countPasskeys(args.userId),
    ]);

    const membership = user?.members[0];
    if (!user || !membership) return;

    const owners = await prisma.member.findMany({
      where: { organizationId: membership.organizationId, role: "owner" },
      select: { user: { select: { email: true } } },
    });

    const recipients = owners
      .map((owner) => owner.user.email)
      .filter((email) => email !== user.email);
    if (recipients.length === 0) return;

    const html = await renderEmailHtml(
      PasskeyEnrolledEmail({
        memberEmail: user.email,
        organizationName: membership.organization.name,
        deviceLabel: args.deviceLabel,
        deviceCount,
        enrolledAt: new Date().toUTCString(),
      })
    );

    for (const recipient of recipients) {
      await emailQueue.add("send", {
        to: recipient,
        subject: `A new passkey was added for ${user.email}`,
        html,
        from: `${appConfig.APP_EMAIL}`,
      });
    }
  } catch (error) {
    console.error("[passkey] owner notification failed", error);
  }
};
