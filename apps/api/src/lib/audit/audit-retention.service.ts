import { Injectable, Logger } from "@nestjs/common";
import { appConfig } from "../../config/app-config";
import { prisma } from "../prisma/prisma";
import { runUnscoped } from "../prisma/tenant-context";
import { AuditService } from "./audit.service";

// 6 years, the §164.316(b)(2)(i) minimum. The database enforces the same floor
// inside the append-only trigger, so this constant decides when the job bothers
// looking, not whether a row is allowed to go.
export const AUDIT_RETENTION_DAYS = 2190;

// Bounded so one run cannot hold a long transaction over the whole table.
const BATCH_SIZE = 1000;
const MAX_BATCHES_PER_RUN = 50;

export interface PurgeOutcome {
  cutoff: string;
  eligible: number;
  deleted: number;
  dryRun: boolean;
  exhausted: boolean;
}

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(private readonly audit: AuditService) {}

  private cutoff(): Date {
    return new Date(Date.now() - AUDIT_RETENTION_DAYS * 86_400_000);
  }

  async run(): Promise<PurgeOutcome> {
    const cutoff = this.cutoff();

    // AuditLog carries actorOrgId but no organizationId, so it is not a scoped
    // model; the unscoped wrapper is for the tenant store, not a bypass.
    const eligible = await runUnscoped(() =>
      prisma.auditLog.count({ where: { createdAt: { lt: cutoff } } })
    );

    const base = {
      cutoff: cutoff.toISOString(),
      eligible,
      dryRun: !appConfig.RETENTION_PURGE_ENABLED,
    };

    if (eligible === 0) {
      return { ...base, deleted: 0, exhausted: true };
    }

    if (!appConfig.RETENTION_PURGE_ENABLED) {
      this.logger.warn(
        `Retention dry run: ${eligible} AuditLog rows predate ${base.cutoff}. Set RETENTION_PURGE_ENABLED=true to remove them.`
      );
      await this.record(base.cutoff, eligible, 0, true);
      return { ...base, deleted: 0, exhausted: false };
    }

    let deleted = 0;
    let batches = 0;

    while (batches < MAX_BATCHES_PER_RUN) {
      const removed = await this.deleteBatch(cutoff);
      deleted += removed;
      batches++;
      if (removed < BATCH_SIZE) break;
    }

    this.logger.log(
      `Retention purge removed ${deleted} AuditLog rows older than ${base.cutoff}`
    );
    await this.record(base.cutoff, eligible, deleted, false);

    return { ...base, deleted, exhausted: deleted >= eligible };
  }

  // The opt-in is transaction-local, so it and the DELETE must share one
  // transaction to land on the same connection. set_config's third argument is
  // what makes it local, and it expires with the transaction, so nothing has to
  // reset it afterwards. Used in place of SET LOCAL because a dotted custom
  // parameter needs no quoting decisions in function form.
  private async deleteBatch(cutoff: Date): Promise<number> {
    return runUnscoped(() =>
      prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('audit.purge', 'on', true)`;

        const rows = await tx.$executeRaw`
          DELETE FROM auth_schema."AuditLog"
          WHERE "id" IN (
            SELECT "id" FROM auth_schema."AuditLog"
            WHERE "createdAt" < ${cutoff}
            ORDER BY "createdAt"
            LIMIT ${BATCH_SIZE}
          )
        `;

        return rows;
      })
    );
  }

  // The purge is itself an auditable event, and this row outlives what it removed.
  private async record(
    cutoff: string,
    eligible: number,
    deleted: number,
    dryRun: boolean
  ): Promise<void> {
    await this.audit.record({
      action: dryRun ? "retention.dry_run" : "retention.purge",
      resourceType: "AuditLog",
      metadata: {
        cutoff,
        eligible,
        deleted,
        retentionDays: AUDIT_RETENTION_DAYS,
      },
    });
  }
}
