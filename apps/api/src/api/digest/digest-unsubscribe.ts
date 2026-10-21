import { createHmac, timingSafeEqual } from "crypto";
import { derivePurposeKey } from "../../lib/crypto/crypto";

const sign = (memberId: string) =>
  createHmac("sha256", derivePurposeKey("digest-unsubscribe"))
    .update(memberId)
    .digest("base64url");

// A signed member id rather than a stored token, so sending never writes a row.
export const signDigestToken = (memberId: string) =>
  `${memberId}.${sign(memberId)}`;

export const verifyDigestToken = (token: string): string | null => {
  const split = token.lastIndexOf(".");
  if (split < 1) return null;

  const memberId = token.slice(0, split);
  const expected = Buffer.from(sign(memberId));
  const provided = Buffer.from(token.slice(split + 1));

  return expected.length === provided.length &&
    timingSafeEqual(expected, provided)
    ? memberId
    : null;
};

// GET only renders a button, so link scanners that prefetch cannot unsubscribe anyone.
export const unsubscribePage = (message: string, withForm: boolean) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Weekly digest</title></head>` +
  `<body style="font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px">` +
  `<p>${message}</p>` +
  (withForm ? `<form method="post"><button type="submit">Unsubscribe</button></form>` : "") +
  `</body></html>`;
