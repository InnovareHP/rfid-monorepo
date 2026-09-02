const config = { RETENTION_PURGE_ENABLED: false };
jest.mock("../../config/app-config", () => ({
  appConfig: config,
}));

const count = jest.fn();
const adminCount = jest.fn();
const $transaction = jest.fn();
jest.mock("../prisma/prisma", () => ({
  prisma: {
    auditLog: { count: (...a: unknown[]) => count(...a) },
    adminActivityLog: { count: (...a: unknown[]) => adminCount(...a) },
    $transaction: (...a: unknown[]) => $transaction(...a),
  },
}));

jest.mock("../prisma/tenant-context", () => ({
  runUnscoped: (fn: () => unknown) => fn(),
}));

import {
  AUDIT_RETENTION_DAYS,
  AUDIT_TABLES,
  AuditRetentionService,
} from "./audit-retention.service";

const record = jest.fn();
const auditService = { record } as any;

// Collects what each transaction ran, so the opt-in and the DELETE can be shown
// to share one transaction rather than merely both having happened.
let transactions: string[][];

// The table name is a Prisma.raw value rather than part of the template, so the
// rendered statement has to interleave values or the assertions see a hole.
const renderValue = (value: unknown) =>
  value && typeof value === "object" && "sql" in (value as { sql?: unknown })
    ? String((value as { sql: unknown }).sql)
    : "?";

const render = (strings: TemplateStringsArray, values: unknown[]) =>
  strings
    .reduce(
      (acc, part, index) =>
        acc + part + (index < values.length ? renderValue(values[index]) : ""),
      ""
    )
    .trim();

const txRunner = (rowsPerBatch: number[]) => {
  let call = 0;
  return async (fn: (tx: unknown) => Promise<number>) => {
    const statements: string[] = [];
    transactions.push(statements);
    const tx = {
      $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
        statements.push(render(strings, values));
        return Promise.resolve([]);
      },
      $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
        statements.push(render(strings, values));
        return Promise.resolve(rowsPerBatch[call++] ?? 0);
      },
    };
    return fn(tx);
  };
};

describe("AuditRetentionService", () => {
  let service: AuditRetentionService;

  beforeEach(() => {
    jest.clearAllMocks();
    transactions = [];
    config.RETENTION_PURGE_ENABLED = false;
    count.mockResolvedValue(0);
    adminCount.mockResolvedValue(0);
    service = new AuditRetentionService(auditService);
  });

  it("uses a six year floor", () => {
    expect(AUDIT_RETENTION_DAYS).toBe(2190);
  });

  // Every table carrying the append-only trigger needs a way past it, or it
  // grows forever.
  it("covers both append-only tables", async () => {
    const outcomes = await service.run();

    expect(AUDIT_TABLES).toEqual(["AuditLog", "AdminActivityLog"]);
    expect(outcomes.map((outcome) => outcome.table)).toEqual([
      "AuditLog",
      "AdminActivityLog",
    ]);
  });

  it("selects on a cutoff six years back", async () => {
    await service.run();

    const { createdAt } = count.mock.calls[0][0].where;
    const ageDays = (Date.now() - createdAt.lt.getTime()) / 86_400_000;
    expect(Math.round(ageDays)).toBe(2190);
  });

  it("deletes nothing while the purge is disabled", async () => {
    count.mockResolvedValue(42);

    const [audit] = await service.run();

    expect(audit).toMatchObject({ dryRun: true, deleted: 0, eligible: 42 });
    expect($transaction).not.toHaveBeenCalled();
  });

  it("records a dry run so the backlog is visible in the log itself", async () => {
    count.mockResolvedValue(42);

    await service.run();

    expect(record.mock.calls[0][0]).toMatchObject({
      action: "retention.dry_run",
      resourceType: "AuditLog",
      metadata: { eligible: 42, deleted: 0 },
    });
  });

  it("stays quiet when nothing is eligible", async () => {
    const outcomes = await service.run();

    expect(outcomes.every((outcome) => outcome.exhausted)).toBe(true);
    expect(record).not.toHaveBeenCalled();
    expect($transaction).not.toHaveBeenCalled();
  });

  describe("with the purge enabled", () => {
    beforeEach(() => {
      config.RETENTION_PURGE_ENABLED = true;
    });

    it("opts in inside the same transaction as the delete", async () => {
      count.mockResolvedValue(10);
      $transaction.mockImplementation(txRunner([10]));

      await service.run();

      expect(transactions).toHaveLength(1);
      const [statements] = transactions;
      expect(statements[0]).toContain("set_config('audit.purge', 'on', true)");
      expect(statements[1]).toContain('DELETE FROM auth_schema."AuditLog"');
    });

    it("purges the admin activity log against its own table", async () => {
      adminCount.mockResolvedValue(5);
      $transaction.mockImplementation(txRunner([5]));

      const [, admin] = await service.run();

      expect(admin).toMatchObject({
        table: "AdminActivityLog",
        deleted: 5,
        exhausted: true,
      });
      expect(transactions[0][1]).toContain(
        'DELETE FROM auth_schema."AdminActivityLog"'
      );
    });

    it("stops once a batch comes back short", async () => {
      count.mockResolvedValue(1500);
      $transaction.mockImplementation(txRunner([1000, 500]));

      const [audit] = await service.run();

      expect(audit.deleted).toBe(1500);
      expect(transactions).toHaveLength(2);
      expect(audit.dryRun).toBe(false);
    });

    it("caps the work per run and reports the backlog as unfinished", async () => {
      count.mockResolvedValue(1_000_000);
      $transaction.mockImplementation(txRunner(Array(60).fill(1000)));

      const [audit] = await service.run();

      expect(transactions).toHaveLength(50);
      expect(audit.deleted).toBe(50_000);
      expect(audit.exhausted).toBe(false);
    });

    it("audits the purge as an event that outlives what it removed", async () => {
      count.mockResolvedValue(10);
      $transaction.mockImplementation(txRunner([10]));

      await service.run();

      expect(record.mock.calls[0][0]).toMatchObject({
        action: "retention.purge",
        resourceType: "AuditLog",
        metadata: { eligible: 10, deleted: 10, retentionDays: 2190 },
      });
    });
  });
});
