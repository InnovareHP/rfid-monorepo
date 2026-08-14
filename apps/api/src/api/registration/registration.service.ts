import { BadRequestException, Injectable } from "@nestjs/common";
import { appConfig } from "../../config/app-config";
import { auth } from "../../lib/auth/auth";
import {
  consumeEnrollmentClaim,
  createRecoveryClaim,
  createSignupClaim,
} from "../../lib/auth/passkey-registration";
import {
  issueOtp,
  verifyOtp,
  type OtpPurpose,
} from "../../lib/auth/registration-otp-store";
import { consumeSlidingLimit } from "../../lib/auth/sliding-limiter";
import { renderEmailHtml } from "../../lib/aws/ses";
import { prisma } from "../../lib/prisma/prisma";
import { emailQueue } from "../../lib/queue/email-queue";
import { OtpEmail } from "../../react-email/otp-email";

// Every migration eligibility failure returns this, so the endpoint is not an
// account-or-enrollment oracle.
const MIGRATION_SENT = { sent: true } as const;

@Injectable()
export class RegistrationService {
  private async sendCode(purpose: OtpPurpose, email: string) {
    const otp = await issueOtp(purpose, email);
    const html = await renderEmailHtml(OtpEmail({ validationCode: otp.code }));
    await emailQueue.add("send", {
      to: email,
      subject: `Your ${appConfig.APP_NAME} verification code`,
      html,
      from: `${appConfig.APP_EMAIL}`,
    });
  }

  // Keyed per email so rotating IPs cannot mailbomb one mailbox.
  private async limitSendsPerEmail(purpose: OtpPurpose, email: string) {
    const limit = await consumeSlidingLimit({
      key: `registration:send:${purpose}:${email}`,
      limit: 3,
      windowSeconds: 60 * 10,
    });
    if (!limit.allowed) {
      throw new BadRequestException(
        `Too many codes requested for this email. Try again in ${limit.retryAfterSeconds} seconds.`
      );
    }
  }

  async sendSignupOtp(email: string) {
    await this.limitSendsPerEmail("signup", email);

    const existing = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    // Accepted trade for a usable signup flow: this confirms the address is taken.
    if (existing) {
      throw new BadRequestException(
        "An account already exists for this email. Sign in instead, or reset your password."
      );
    }

    await this.sendCode("signup", email);
    return { sent: true };
  }

  // Second half of a verified signup: the code was already checked and traded
  // for a claim, so the password step carries that claim rather than the code.
  // The email comes off the claim, never off the request, so a caller cannot
  // verify one address and then register another.
  async completeSignup(context: string, password: string) {
    const claim = await consumeEnrollmentClaim(context);

    if (!claim || claim.kind !== "signup") {
      throw new BadRequestException(
        "This signup session has expired. Start again."
      );
    }

    const { email, name } = claim;

    const existing = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        "An account already exists for this email. Sign in instead."
      );
    }

    // Better Auth's configured hasher, so sign-in verifies the same way and a
    // custom hash option would be honoured here too.
    const { password: passwordCtx } = await auth.$context;
    const hashed = await passwordCtx.hash(password);

    // Ids and timestamps come from the column defaults.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          // The code already proved the address, so no second email round trip.
          emailVerified: true,
        },
        select: { id: true },
      });

      await tx.userAccount.create({
        data: {
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashed,
        },
      });
    });

    return { created: true, email };
  }

  async verifySignupOtp(email: string, name: string, code: string) {
    const verified = await verifyOtp("signup", email, code);
    if (!verified) {
      throw new BadRequestException("That code is invalid or has expired.");
    }

    const existing = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        "An account already exists for this email. Sign in instead."
      );
    }

    const claim = await createSignupClaim({
      email,
      name,
      displayName: name,
    });
    return { context: claim.token, expiresInSeconds: claim.expiresInSeconds };
  }

  // The invitation id is not proof of mailbox control: whoever sent the invite
  // holds it too, and can read it back off their own pending list. So it buys an
  // enrollment grant only for an email that has no account yet. An existing user
  // joining a second org signs in with their own passkey, or recovers through
  // the mailbox OTP in sendMigrationOtp.
  async invitationContext(invitationId: string) {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, status: "pending" },
      select: { email: true, expiresAt: true },
    });
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new BadRequestException(
        "This invitation is no longer valid. Ask your organization owner to send a new one."
      );
    }

    const email = invitation.email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        "An account already exists for this email. Sign in with your passkey to accept this invitation."
      );
    }

    const claim = await createSignupClaim({
      email,
      name: email,
      displayName: email,
    });
    return {
      context: claim.token,
      email,
      expiresInSeconds: claim.expiresInSeconds,
    };
  }

  // Empty or unparseable deadline leaves the path open indefinitely.
  private migrationOpen() {
    const raw = appConfig.PASSKEY_MIGRATION_DEADLINE;
    if (!raw) return true;
    const deadline = new Date(raw);
    if (Number.isNaN(deadline.getTime())) return true;
    return deadline > new Date();
  }

  private async migrationEligible(email: string) {
    if (!this.migrationOpen()) return null;
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, _count: { select: { passkeys: true } } },
    });
    if (!user || user._count.passkeys > 0) return null;
    return user;
  }

  async sendMigrationOtp(email: string) {
    await this.limitSendsPerEmail("migration", email);

    const user = await this.migrationEligible(email);
    if (!user) return MIGRATION_SENT;

    await this.sendCode("migration", email);
    return MIGRATION_SENT;
  }

  async verifyMigrationOtp(email: string, code: string) {
    const verified = await verifyOtp("migration", email, code);
    if (!verified) {
      throw new BadRequestException("That code is invalid or has expired.");
    }

    // Re-checked after the code verifies: a device enrolled between send and
    // verify closes this path.
    const user = await this.migrationEligible(email);
    if (!user) {
      throw new BadRequestException(
        "This account can no longer be migrated. Sign in with your passkey, or ask your owner to reset your access."
      );
    }

    // Yields an enrollment grant and nothing else — never a session.
    const claim = await createRecoveryClaim({ userId: user.id, email }, "self");
    return { context: claim.token, expiresInSeconds: claim.expiresInSeconds };
  }
}
