const config = { RETENTION_PURGE_ENABLED: false };
jest.mock("../../config/app-config", () => ({
  appConfig: config,
}));

const count = jest.fn();
const $transaction = jest.fn();
jest.mock("../prisma/prisma", () => ({
  prisma: {
    auditLog: { count: (...a: unknown[]) => count(...a) },
    $transaction: (...a: unknown[]) => $transaction(...a),
  },
}));

jest.mock("../prisma/tenant-context", () => ({
  runUnscoped: (fn: () => unknown) => fn(),
}));

import {
  AUDIT_RETENTION_DAYS,
  AuditRetentionService,
} from "./audit-retention.service";

const record = jest.fn();
const auditService = { record } as any;

// Collects what each transaction ran, so the opt-in and the DELETE can be shown
// to share one transaction rather than merely both having happened.
let transactions: string[][];

const txRunner = (rowsPerBatch: number[]) => {
  let call = 0;
  return async (fn: (tx: unknown) => Promise<number>) => {
    const statements: string[] = [];
    transactions.push(statements);
    const tx = {
      $queryRaw: (strings: TemplateStringsArray) => {
        statements.push(strings.join("?").trim());
        return Promise.resolve([]);
      },
      $executeRaw: (strings: TemplateStringsArray) => {
        statements.push(strings.join("?").trim());
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
    service = new AuditRetentionService(auditService);
  });

  it("uses a six year floor", () => {
    expect(AUDIT_RETENTION_DAYS).toBe(2190);
  });

  it("selects on a cutoff six years back", async () => {
    count.mockResolvedValue(0);

    await service.run();

    const { createdAt } = count.mock.calls[0][0].where;
    const ageDays = (Date.now() - createdAt.lt.getTime()) / 86_400_000;
    expect(Math.round(ageDays)).toBe(2190);
  });

  it("deletes nothing while the purge is disabled", async () => {
    count.mockResolvedValue(42);

    const outcome = await service.run();

    expect(outcome).toMatchObject({ dryRun: true, deleted: 0, eligible: 42 });
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
    count.mockResolvedValue(0);

    const outcome = await service.run();

    expect(outcome).toMatchObject({ deleted: 0, exhausted: true });
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

    it("stops once a batch comes back short", async () => {
      count.mockResolvedValue(1500);
      $transaction.mockImplementation(txRunner([1000, 500]));

      const outcome = await service.run();

      expect(outcome.deleted).toBe(1500);
      expect(transactions).toHaveLength(2);
      expect(outcome.dryRun).toBe(false);
    });

    it("caps the work per run and reports the backlog as unfinished", async () => {
      count.mockResolvedValue(1_000_000);
      $transaction.mockImplementation(txRunner(Array(60).fill(1000)));

      const outcome = await service.run();

      expect(transactions).toHaveLength(50);
      expect(outcome.deleted).toBe(50_000);
      expect(outcome.exhausted).toBe(false);
    });

    it("audits the purge as an event that outlives what it removed", async () => {
      count.mockResolvedValue(10);
      $transaction.mockImplementation(txRunner([10]));

      await service.run();

      expect(record.mock.calls[0][0]).toMatchObject({
        action: "retention.purge",
        metadata: { eligible: 10, deleted: 10, retentionDays: 2190 },
      });
    });
  });
});
