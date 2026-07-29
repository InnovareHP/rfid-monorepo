import { Injectable, Logger } from "@nestjs/common";
import { createHmac, randomBytes } from "crypto";
import { appConfig } from "../../config/app-config";
import { AuditService } from "../../lib/audit/audit.service";
import { prisma } from "../../lib/prisma/prisma";

// Transparent 1x1 GIF returned for every tracking hit.
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Mailbox providers prefetch images on delivery, so opens this soon are not human.
const PREFETCH_WINDOW_MS = 10_000;

// Collapse repeat hits from the same client into one open.
const DEDUPE_WINDOW_MS = 60_000;

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(private readonly auditService: AuditService) {}

  get pixel(): Buffer {
    return TRACKING_PIXEL;
  }

  newTrackingId(): string {
    return randomBytes(16).toString("hex");
  }

  pixelUrl(trackingId: string): string {
    return `${appConfig.API_URL}/api/email/o/${trackingId}.gif`;
  }

  // Synthetic References id, echoed back by replying clients so inbound mail can be threaded.
  threadReference(trackingId: string): string | null {
    if (!appConfig.EMAIL_INGEST_DOMAIN) return null;
    return `<a.${trackingId}@${appConfig.EMAIL_INGEST_DOMAIN}>`;
  }

  injectPixel(html: string, trackingId: string): string {
    if (!appConfig.EMAIL_OPEN_TRACKING) return html;

    const img = `<img src="${this.pixelUrl(trackingId)}" width="1" height="1" alt="" style="display:none;max-height:0;overflow:hidden" />`;

    return html.includes("</body>")
      ? html.replace("</body>", `${img}</body>`)
      : `${html}${img}`;
  }

  private hashIp(ip: string, organizationId: string): string {
    return createHmac("sha256", appConfig.ENCRYPTION_KEY)
      .update(`${organizationId}:${ip}`)
      .digest("hex");
  }

  // Coarse client family only, never the raw user agent.
  private clientType(userAgent: string | undefined): string {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("googleimageproxy")) return "gmail-proxy";
    if (ua.includes("yahoomailproxy")) return "yahoo-proxy";
    if (ua.includes("outlook") || ua.includes("microsoft")) return "outlook";
    if (ua.includes("applemail") || ua.includes("apple-mail"))
      return "apple-mail";
    if (ua.includes("thunderbird")) return "thunderbird";
    if (
      ua.includes("mobile") ||
      ua.includes("android") ||
      ua.includes("iphone")
    )
      return "mobile";
    return "browser";
  }

  async recordOpen(
    trackingId: string,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<void> {
    const activity = await prisma.activity.findUnique({
      where: { trackingId },
      select: {
        id: true,
        organizationId: true,
        emailSentAt: true,
        createdAt: true,
      },
    });

    if (!activity) return;

    const sentAt = activity.emailSentAt ?? activity.createdAt;
    if (Date.now() - sentAt.getTime() < PREFETCH_WINDOW_MS) return;

    const ipHash = ip ? this.hashIp(ip, activity.organizationId) : null;
    const clientType = this.clientType(userAgent);

    const recent = await prisma.emailOpenEvent.findFirst({
      where: {
        activityId: activity.id,
        ipHash,
        clientType,
        occurredAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      select: { id: true },
    });

    if (recent) return;

    const now = new Date();

    await prisma.$transaction([
      prisma.emailOpenEvent.create({
        data: {
          activityId: activity.id,
          organizationId: activity.organizationId,
          ipHash,
          clientType,
          occurredAt: now,
        },
      }),
      prisma.activity.update({
        where: { id: activity.id },
        data: {
          openCount: { increment: 1 },
          lastOpenedAt: now,
        },
      }),
      prisma.activity.updateMany({
        where: { id: activity.id, firstOpenedAt: null },
        data: { firstOpenedAt: now },
      }),
      // updateMany (not update): trackingId usually belongs to a non-blast
      // Activity, so zero matching rows here must be a no-op, not a throw.
      prisma.blastRecipient.updateMany({
        where: { trackingId },
        data: { openCount: { increment: 1 }, lastOpenedAt: now },
      }),
      prisma.blastRecipient.updateMany({
        where: { trackingId, firstOpenedAt: null },
        data: { firstOpenedAt: now },
      }),
    ]);

    await this.auditService.record({
      actorOrgId: activity.organizationId,
      action: "email.open",
      resourceType: "Activity",
      resourceId: activity.id,
      metadata: { clientType },
    });
  }
}
