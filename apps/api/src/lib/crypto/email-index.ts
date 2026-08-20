import { createHmac, timingSafeEqual } from "crypto";
import { derivePurposeKey } from "./crypto";

// Email columns are encrypted at rest, so equality matching goes through a
// keyed blind index instead. Same construction as the open-tracking ip hash.
export const emailIndex = (email: string): string =>
  createHmac("sha256", derivePurposeKey("marketing-email-index"))
    .update(normalizeEmail(email))
    .digest("hex");

// Addresses are compared case-insensitively, so the index is built on a
// normalized form rather than whatever casing was typed.
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export type UnsubscribeClaim = { organizationId: string; emailHash: string };

const sign = (payload: string) =>
  createHmac("sha256", derivePurposeKey("marketing-unsubscribe"))
    .update(payload)
    .digest("base64url");

// The link carries a signed claim rather than a stored key, so mailing someone
// never creates a subscriber row - and it carries the email's hash, never the
// address, so no inbox address ends up in a URL or a server log.
export const signUnsubscribeToken = (
  organizationId: string,
  email: string
): string => {
  const payload = `${organizationId}.${emailIndex(email)}`;

  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
};

// The subscribe link is org-wide rather than per person, so it signs only the
// organization. It is safe to forward: whoever opens it types their own address.
export const signSubscribeToken = (organizationId: string): string =>
  `${Buffer.from(organizationId).toString("base64url")}.${sign(organizationId)}`;

export const verifySubscribeToken = (token: string): string | null => {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const organizationId = Buffer.from(encoded, "base64url").toString();

  return signaturesMatch(sign(organizationId), signature)
    ? organizationId
    : null;
};

const signaturesMatch = (expected: string, provided: string) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);

  return a.length === b.length && timingSafeEqual(a, b);
};

export const verifyUnsubscribeToken = (
  token: string
): UnsubscribeClaim | null => {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const payload = Buffer.from(encoded, "base64url").toString();
  if (!signaturesMatch(sign(payload), signature)) return null;

  const [organizationId, emailHash] = payload.split(".");
  if (!organizationId || !emailHash) return null;

  return { organizationId, emailHash };
};
