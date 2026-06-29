import { Injectable, Logger } from "@nestjs/common";
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
          changeHash: entry.changeHash ?? null,
          metadata: (entry.metadata ?? null) as any,
        },
      });
    } catch (err) {
      this.logger.error("Failed to write audit log", err as Error);
    }
  }
}
