import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { appConfig } from "../../config/app-config";
import { prisma } from "../prisma/prisma";

export interface AuditEntry {
  actorUserId?: string | null;
  actorOrgId?: string | null;
  actorRole?: string | null;
  actorIp?: string | null;
  actorUserAgent?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  requestId?: string | null;
  changeHash?: string | null;
  metadata?: Record<string, unknown> | null;
}

function signEntry(entry: AuditEntry): string {
  const canonical = JSON.stringify([
    entry.actorUserId ?? null,
    entry.actorOrgId ?? null,
    entry.actorRole ?? null,
    entry.actorIp ?? null,
    entry.action,
    entry.resourceType ?? null,
    entry.resourceId ?? null,
    entry.method ?? null,
    entry.path ?? null,
    entry.statusCode ?? null,
    entry.requestId ?? null,
  ]);
  return createHmac("sha256", appConfig.ENCRYPTION_KEY)
    .update(canonical)
    .digest("hex");
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async record(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: entry.actorUserId ?? null,
          actorOrgId: entry.actorOrgId ?? null,
          actorRole: entry.actorRole ?? null,
          actorIp: entry.actorIp ?? null,
          actorUserAgent: entry.actorUserAgent ?? null,
          action: entry.action,
          resourceType: entry.resourceType ?? null,
          resourceId: entry.resourceId ?? null,
          method: entry.method ?? null,
          path: entry.path ?? null,
          statusCode: entry.statusCode ?? null,
          durationMs: entry.durationMs ?? null,
          requestId: entry.requestId ?? null,
          changeHash: entry.changeHash ?? signEntry(entry),
          metadata: (entry.metadata ?? null) as any,
        },
      });
    } catch (err) {
      // DB write failed — emit the full entry to stdout so the event still
      // lands in the log pipeline instead of vanishing (§164.312(b)).
      this.logger.error(
        `AUDIT_FALLBACK ${JSON.stringify({ ...entry, sig: signEntry(entry) })}`,
        err as Error
      );
    }
  }

  verify(entry: AuditEntry, changeHash: string | null): boolean {
    return changeHash === signEntry(entry);
  }
}
