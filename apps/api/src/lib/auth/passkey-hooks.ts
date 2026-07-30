import { APIError } from "better-auth/api";
import type { GenericEndpointContext } from "@better-auth/core";
import { prisma } from "../prisma/prisma";
import { getAuthenticatorName } from "./authenticator-names";
import {
  assertPasskeyCapacity,
  notifyOwnerOfEnrollment,
} from "./passkey-enrollment";
import {
  consumeEnrollmentClaim,
  peekEnrollmentClaim,
} from "./passkey-registration";
import { recordSignInDevice } from "./session-devices";

// The context token is the entire authorization when there is no session, so an
// unknown token must never fall through to a usable ceremony.
export const resolvePasskeyRegistrationUser = async ({
  context,
}: {
  ctx: GenericEndpointContext;
  context?: string | null;
}) => {
  if (!context) {
    throw new APIError("UNAUTHORIZED", {
      message: "Sign in or use an enrollment code to register a passkey.",
    });
  }

  // Peek rather than consume: the ceremony may still be abandoned at the prompt.
  const claim = await peekEnrollmentClaim(context);
  if (!claim) {
    throw new APIError("BAD_REQUEST", {
      message: "This enrollment code is invalid or has expired.",
    });
  }

  // Signup has no user row yet, so the ceremony runs against a placeholder.
  if (claim.kind === "signup") {
    return {
      id: `pending:${context}`,
      name: claim.email,
      displayName: claim.displayName,
    };
  }

  return { id: claim.userId, name: claim.email, displayName: claim.email };
};

export const afterPasskeyRegistration = async ({
  ctx,
  verification,
  user,
  context,
}: {
  ctx: GenericEndpointContext;
  verification: { registrationInfo?: { aaguid?: string } };
  user: { id: string };
  context?: string | null;
}) => {
  const deviceLabel = getAuthenticatorName(
    verification.registrationInfo?.aaguid
  );

  // No context means an authenticated user adding another device.
  if (!context) {
    await assertPasskeyCapacity(user.id);
    await notifyOwnerOfEnrollment({ userId: user.id, deviceLabel });
    return { name: deviceLabel };
  }

  // Consume only now that WebAuthn has verified, so one grant yields one credential.
  const claim = await consumeEnrollmentClaim(context);
  if (!claim) {
    throw new APIError("BAD_REQUEST", {
      message: "This enrollment code is invalid or has expired.",
    });
  }

  if (claim.kind === "recovery") {
    await assertPasskeyCapacity(claim.userId);
    await notifyOwnerOfEnrollment({ userId: claim.userId, deviceLabel });
    return { userId: claim.userId, name: deviceLabel };
  }

  // Mailbox control is not account access: refuse to attach at the last point.
  const existing = await prisma.user.findFirst({
    where: { email: claim.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) {
    throw new APIError("BAD_REQUEST", {
      message:
        "An account already exists for this email. Sign in with an existing passkey, or ask your owner to reset your access.",
    });
  }

  const created = await ctx.context.internalAdapter.createUser({
    email: claim.email.toLowerCase(),
    name: claim.name,
    emailVerified: true,
  });

  return { userId: created.id, name: deviceLabel };
};

export const afterPasskeyAuthentication = async ({
  ctx,
  clientData,
}: {
  ctx: GenericEndpointContext;
  clientData: { id: string };
}) => {
  const passkey = await prisma.passkey.findUnique({
    where: { credentialID: clientData.id },
    select: { userId: true },
  });
  if (!passkey) return;

  await recordSignInDevice({
    userId: passkey.userId,
    userAgent: ctx.headers?.get("user-agent") ?? "unknown",
    ip:
      ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      ctx.headers?.get("x-real-ip") ??
      "unknown",
  });
};
