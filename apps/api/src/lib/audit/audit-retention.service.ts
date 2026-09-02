import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { appConfig } from "../../config/app-config";
import { prisma } from "../prisma/prisma";
import { runUnscoped } from "../prisma/tenant-context";
import { AuditService } from "./audit.service";

// 6 years, the §164.316(b)(2)(i) minimum. The database enforces the same floor
// inside the append-only trigger, so this constant decides when the job bothers
// looking, not whether a row is allowed to go.
export const AUDIT_RETENTION_DAYS = 2190;

// Both tables carry the append-only trigger, so both need a way past it once a
// row is genuinely expired. A table locked with no purge path would simply grow
// forever. Closed list: the names are interpolated into raw SQL below.
export const AUDIT_TABLES = ["AuditLog", "AdminActivityLog"] as const;

export type AuditTable = (typeof AUDIT_TABLES)[number];

// Bounded so one run cannot hold a long transaction over the whole table.
const BATCH_SIZE = 1000;
const MAX_BATCHES_PER_RUN = 50;

export interface PurgeOutcome {
  table: AuditTable;
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

  async run(): Promise<PurgeOutcome[]> {
    const outcomes: PurgeOutcome[] = [];

    for (const table of AUDIT_TABLES) {
      outcomes.push(await this.runFor(table));
    }

    return outcomes;
  }

  // Neither table carries an organizationId, so neither is a scoped model; the
  // unscoped wrapper is for the tenant store, not a bypass.
  private countEligible(table: AuditTable, cutoff: Date) {
    const where = { createdAt: { lt: cutoff } };

    return runUnscoped(() =>
      table === "AuditLog"
        ? prisma.auditLog.count({ where })
        : prisma.adminActivityLog.count({ where })
    );
  }

  private async runFor(table: AuditTable): Promise<PurgeOutcome> {
    const cutoff = this.cutoff();
    const eligible = await this.countEligible(table, cutoff);

    const base = {
      table,
      cutoff: cutoff.toISOString(),
      eligible,
      dryRun: !appConfig.RETENTION_PURGE_ENABLED,
    };

    if (eligible === 0) {
      return { ...base, deleted: 0, exhausted: true };
    }

    if (!appConfig.RETENTION_PURGE_ENABLED) {
      this.logger.warn(
        `Retention dry run: ${eligible} ${table} rows predate ${base.cutoff}. Set RETENTION_PURGE_ENABLED=true to remove them.`
      );
      await this.record(table, base.cutoff, eligible, 0, true);
      return { ...base, deleted: 0, exhausted: false };
    }

    let deleted = 0;
    let batches = 0;

    while (batches < MAX_BATCHES_PER_RUN) {
      const removed = await this.deleteBatch(table, cutoff);
      deleted += removed;
      batches++;
      if (removed < BATCH_SIZE) break;
    }

    this.logger.log(
      `Retention purge removed ${deleted} ${table} rows older than ${base.cutoff}`
    );
    await this.record(table, base.cutoff, eligible, deleted, false);

    return { ...base, deleted, exhausted: deleted >= eligible };
  }

  // The opt-in is transaction-local, so it and the DELETE must share one
  // transaction to land on the same connection. set_config's third argument is
  // what makes it local, and it expires with the transaction, so nothing has to
  // reset it afterwards. Used in place of SET LOCAL because a dotted custom
  // parameter needs no quoting decisions in function form.
  private async deleteBatch(table: AuditTable, cutoff: Date): Promise<number> {
    // An identifier cannot be a bind parameter, and the name comes from
    // AUDIT_TABLES rather than anything a caller supplies.
    const target = Prisma.raw(`auth_schema."${table}"`);

    return runUnscoped(() =>
      prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('audit.purge', 'on', true)`;

        const rows = await tx.$executeRaw`
          DELETE FROM ${target}
          WHERE "id" IN (
            SELECT "id" FROM ${target}
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
    table: AuditTable,
    cutoff: string,
    eligible: number,
    deleted: number,
    dryRun: boolean
  ): Promise<void> {
    await this.audit.record({
      action: dryRun ? "retention.dry_run" : "retention.purge",
      resourceType: table,
      metadata: {
        cutoff,
        eligible,
        deleted,
        retentionDays: AUDIT_RETENTION_DAYS,
      },
    });
  }
}
