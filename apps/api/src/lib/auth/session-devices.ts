import { createHash } from "crypto";
import { appConfig } from "../../config/app-config";
import { NewDeviceSignInEmail } from "../../react-email/new-device-sign-in-email";
import { renderEmailHtml } from "../aws/ses";
import { prisma } from "../prisma/prisma";
import { emailQueue } from "../queue/email-queue";
import { redis } from "../redis/redis";

const KNOWN_DEVICES_TTL_SECONDS = 60 * 60 * 24 * 180;

const knownDevicesKey = (userId: string) => `passkey:devices:${userId}`;

// Deliberately coarse: a full fingerprint would flag every mobile IP change and
// train users to ignore the alert.
const networkPrefix = (ip: string) => {
  const parts = ip.split(".");
  return parts.length === 4 ? parts.slice(0, 3).join(".") : ip;
};

const fingerprint = (userAgent: string, ip: string) =>
  createHash("sha256")
    .update(`${userAgent}|${networkPrefix(ip)}`)
    .digest("hex");

const describeDevice = (userAgent: string) => {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Safari\//.test(userAgent)
        ? "Safari"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : "Unknown browser";
  const platform = /Windows/.test(userAgent)
    ? "Windows"
    : /Macintosh|Mac OS/.test(userAgent)
      ? "macOS"
      : /iPhone|iPad/.test(userAgent)
        ? "iOS"
        : /Android/.test(userAgent)
          ? "Android"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown platform";
  return `${browser} on ${platform}`;
};

// The only place a vault-shared synced passkey shows up, which is why sign-ins
// are tracked separately from enrollments.
export const recordSignInDevice = async (args: {
  userId: string;
  userAgent: string;
  ip: string;
}) => {
  try {
    const key = knownDevicesKey(args.userId);
    const added = await redis.sadd(key, fingerprint(args.userAgent, args.ip));
    await redis.expire(key, KNOWN_DEVICES_TTL_SECONDS);

    if (added === 0) return;

    // The first device is account setup, not a new device.
    const knownCount = await redis.scard(key);
    if (knownCount <= 1) return;

    const user = await prisma.user.findFirst({
      where: { id: args.userId },
      select: { email: true },
    });
    if (!user) return;

    const html = await renderEmailHtml(
      NewDeviceSignInEmail({
        deviceLabel: describeDevice(args.userAgent),
        signedInAt: new Date().toUTCString(),
        settingsUrl: `${appConfig.WEBSITE_URL}/profile`,
      })
    );

    await emailQueue.add("send", {
      to: user.email,
      subject: "New sign-in to your account",
      html,
      from: `${appConfig.APP_EMAIL}`,
    });
  } catch (error) {
    console.error("[passkey] new-device alert failed", error);
  }
};
