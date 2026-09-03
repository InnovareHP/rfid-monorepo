import { ROLES } from "@dashboard/shared";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminAction } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { appConfig } from "../../config/app-config";
import { prisma } from "../prisma/prisma";

// The one session-granting link this app keeps, because passkey-only sign-in
// has no self-serve recovery. It is never mailed: a superadmin hands it over on
// an identified support channel, so the email paths blocked in
// session-path-guard.ts stay blocked. Redemption lives in
// admin-sign-in-link.plugin.ts.
export const SIGN_IN_LINK_TTL_SECONDS = 600;
export const SIGN_IN_LINK_VERIFY_PATH = "/admin-sign-in-link/verify";
export const MIN_SIGN_IN_LINK_REASON_LENGTH = 10;

const IDENTIFIER_PREFIX = "admin-sign-in:";

// Only the hash is stored, so a leaked row cannot be replayed as a link.
export const identifierForToken = (token: string) =>
  `${IDENTIFIER_PREFIX}${createHash("sha256").update(token).digest("hex")}`;

export type SignInLinkPayload = {
  userId: string;
  adminId: string;
  adminName: string;
  reason: string;
};

// Customer accounts only: a link into a support or superadmin account would
// hand over the admin surface itself.
export const isLinkable = (user: { role: string; banned: boolean }) =>
  user.role === ROLES.USER && !user.banned;

// Every refusal reaching the caller says the same thing, so an expired link and
// a forged token are indistinguishable from outside.
export class SignInLinkError extends Error {}

// The redemption half lives here rather than in the plugin because
// better-auth/api is ESM and this file has to stay loadable under CJS Jest.
// Only the three adapter calls it needs are named, so the tests can fake them.
export const redeemAdminSignInLink = async <U extends { id: string }, S>(
  token: string,
  adapter: {
    consumeVerificationValue: (
      identifier: string
    ) => Promise<{ value: string; expiresAt: Date } | null>;
    findUserById: (userId: string) => Promise<U | null>;
    createSession: (userId: string) => Promise<S>;
  }
): Promise<{ user: U; session: S }> => {
  // Atomic find and delete, so a replayed token loses the race.
  const record = await adapter.consumeVerificationValue(
    identifierForToken(token)
  );

  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new SignInLinkError("Link is invalid or expired");
  }

  const payload = JSON.parse(record.value) as SignInLinkPayload;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, role: true, banned: true },
  });

  // Re-checked at redemption: the account may have been banned or promoted in
  // the ten minutes since the link was issued.
  if (!user || !isLinkable(user)) {
    throw new SignInLinkError("Account is no longer eligible");
  }

  const authUser = await adapter.findUserById(user.id);
  if (!authUser) throw new SignInLinkError("Account is gone");

  const session = await adapter.createSession(user.id);

  await prisma.adminActivityLog.create({
    data: {
      adminId: payload.adminId,
      adminName: payload.adminName,
      action: AdminAction.USE_SIGN_IN_LINK,
      targetUserId: user.id,
      targetName: user.name,
      details: payload.reason,
    },
  });

  return { user: authUser, session };
};

export const createAdminSignInLink = async (input: {
  targetUserId: string;
  admin: { id: string; name: string };
  reason: string;
  ipAddress: string | null;
}) => {
  const user = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: { id: true, name: true, role: true, banned: true },
  });

  if (!user) throw new NotFoundException("User not found");

  if (user.role !== ROLES.USER) {
    throw new BadRequestException(
      "Sign-in links are only for customer accounts"
    );
  }

  if (user.banned) throw new BadRequestException("This account is banned");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SIGN_IN_LINK_TTL_SECONDS * 1000);
  const payload: SignInLinkPayload = {
    userId: user.id,
    adminId: input.admin.id,
    adminName: input.admin.name,
    reason: input.reason,
  };

  // One live link per account, so issuing a fresh one retires the last.
  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: IDENTIFIER_PREFIX },
      value: { contains: `"userId":"${user.id}"` },
    },
  });

  await prisma.verification.create({
    data: {
      id: uuidv4(),
      identifier: identifierForToken(token),
      value: JSON.stringify(payload),
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.adminActivityLog.create({
    data: {
      adminId: input.admin.id,
      adminName: input.admin.name,
      action: AdminAction.CREATE_SIGN_IN_LINK,
      targetUserId: user.id,
      targetName: user.name,
      details: input.reason,
      ipAddress: input.ipAddress,
    },
  });

  return {
    url: `${appConfig.WEBSITE_URL}/sign-in-link?token=${token}`,
    expiresAt: expiresAt.toISOString(),
  };
};
