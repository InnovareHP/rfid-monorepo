import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../lib/audit/audit.service";
import { getAuthenticatorName } from "../../lib/auth/authenticator-names";
import {
  MAX_PASSKEYS_PER_USER,
  countPasskeys,
} from "../../lib/auth/passkey-enrollment";
import { createRecoveryClaim } from "../../lib/auth/passkey-registration";
import { consumeSlidingLimit } from "../../lib/auth/sliding-limiter";
import { prisma } from "../../lib/prisma/prisma";

export type AuditActor = {
  userId: string;
  organizationId: string | null;
  role: string | null;
  ip: string | null;
  userAgent: string | null;
};

@Injectable()
export class PasskeysService {
  constructor(private readonly auditService: AuditService) {}

  async listOwnPasskeys(userId: string) {
    const passkeys = await prisma.passkey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        aaguid: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return passkeys.map((passkey) => ({
      id: passkey.id,
      label: passkey.name ?? getAuthenticatorName(passkey.aaguid),
      deviceType: passkey.deviceType,
      backedUp: passkey.backedUp,
      createdAt: passkey.createdAt,
    }));
  }

  // Issued to a signed-in user and carried to another machine, because
  // cross-device QR and synced passkeys both fail on a locked-down desktop.
  async createEnrollmentCode(userId: string, email: string) {
    const limit = await consumeSlidingLimit({
      key: `passkey:enrollment-code:${userId}`,
      limit: 5,
      windowSeconds: 60 * 60,
      blockSeconds: 60 * 15,
    });
    if (!limit.allowed) {
      throw new BadRequestException(
        `Too many enrollment codes requested. Try again in ${limit.retryAfterSeconds} seconds.`
      );
    }

    // Checked here, before the user walks over to the other machine.
    const count = await countPasskeys(userId);
    if (count >= MAX_PASSKEYS_PER_USER) {
      throw new BadRequestException(
        `This account already has the maximum of ${MAX_PASSKEYS_PER_USER} passkeys. Remove one before adding another.`
      );
    }

    const claim = await createRecoveryClaim({ userId, email }, "self");
    return { code: claim.token, expiresInSeconds: claim.expiresInSeconds };
  }

  async removeOwnPasskey(userId: string, passkeyId: string) {
    const passkey = await prisma.passkey.findFirst({
      where: { id: passkeyId, userId },
      select: { id: true },
    });
    if (!passkey) throw new NotFoundException("Passkey not found");

    const count = await countPasskeys(userId);
    if (count <= 1) {
      throw new ConflictException(
        "This is your only passkey. Add another device before removing this one."
      );
    }

    await prisma.passkey.delete({ where: { id: passkey.id } });
    return { success: true };
  }

  // Owner-mediated recovery. The code goes to the caller, never by email —
  // emailing it would re-open the hole passkeys were adopted to close.
  async resetMemberPasskeys(
    actor: AuditActor,
    memberId: string,
    reason?: string
  ) {
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        organizationId: actor.organizationId ?? undefined,
      },
      select: { userId: true, user: { select: { email: true } } },
    });
    if (!member) throw new NotFoundException("Member not found");

    // An authenticated session can already enroll another device.
    if (member.userId === actor.userId) {
      throw new ForbiddenException(
        "Add another device from your own settings instead of resetting yourself."
      );
    }

    const removed = await prisma.passkey.deleteMany({
      where: { userId: member.userId },
    });

    const claim = await createRecoveryClaim(
      { userId: member.userId, email: member.user.email },
      "owner"
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorOrgId: actor.organizationId,
      actorRole: actor.role,
      actorIp: actor.ip,
      actorUserAgent: actor.userAgent,
      action: "USER_PASSKEYS_RESET",
      resourceType: "Member",
      resourceId: memberId,
      metadata: { removedCount: removed.count, reason: reason ?? null },
    });

    return {
      code: claim.token,
      expiresInSeconds: claim.expiresInSeconds,
      removedCount: removed.count,
    };
  }
}
