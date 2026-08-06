import { NotFoundException } from "@nestjs/common";

// The constructor opens a Redis-backed QueueEvents, which these methods never
// touch, so the transport is stubbed to keep the unit isolated.
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));

// board.gateway pulls in the auth module for socket verification, which loads
// better-auth's ESM-only passkey plugin. Stubbing it keeps that out of CJS jest.
jest.mock("./board.gateway", () => ({ BoardGateway: jest.fn() }));

jest.mock("../../lib/prisma/prisma", () => {
  const history = {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
  };
  const fieldOption = {
    findFirst: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  };
  const field = { findFirst: jest.fn() };
  const board = { findFirstOrThrow: jest.fn() };

  return {
    prisma: {
      history,
      fieldOption,
      field,
      board,
      $transaction: jest.fn(),
    },
  };
});

import { prisma } from "../../lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { BoardService } from "./board.service";

const ORG = "org-a";
const FOREIGN = "row-owned-by-org-b";

const db = prisma as unknown as {
  history: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
  };
  fieldOption: { findFirst: jest.Mock; update: jest.Mock; create: jest.Mock };
  field: { findFirst: jest.Mock };
  board: { findFirstOrThrow: jest.Mock };
  $transaction: jest.Mock;
};

const queueStub = (job: unknown) => ({
  getJob: jest.fn().mockResolvedValue(job),
});

describe("BoardService tenant isolation", () => {
  let service: BoardService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.history.findFirst.mockResolvedValue(null);
    db.fieldOption.findFirst.mockResolvedValue(null);
    db.field.findFirst.mockResolvedValue(null);

    service = new BoardService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any
    );
  });

  // History rows carry a nullable denormalised organizationId, so ownership is
  // proven through the Board relation, whose organizationId is required.
  describe("deleteRecordHistory", () => {
    it("refuses an audit row belonging to another organization", async () => {
      await expect(service.deleteRecordHistory(FOREIGN, ORG)).rejects.toThrow(
        NotFoundException
      );

      expect(db.history.findFirst.mock.calls[0][0].where).toMatchObject({
        record: { organizationId: ORG },
      });
      expect(db.history.delete).not.toHaveBeenCalled();
    });

    it("deletes once the row is confirmed to be in the organization", async () => {
      db.history.findFirst.mockResolvedValue({ id: FOREIGN });

      await service.deleteRecordHistory(FOREIGN, ORG);

      expect(db.history.delete).toHaveBeenCalledWith({
        where: { id: FOREIGN },
      });
    });
  });

  describe("updateRecordHistory", () => {
    it("scopes the update to the organization", async () => {
      await service.updateRecordHistory(FOREIGN, ORG);

      expect(db.history.updateMany.mock.calls[0][0].where).toMatchObject({
        record: { organizationId: ORG },
      });
    });
  });

  describe("deleteRecordFieldOption", () => {
    it("refuses an option belonging to another organization", async () => {
      await expect(
        service.deleteRecordFieldOption(FOREIGN, ORG)
      ).rejects.toThrow(NotFoundException);

      expect(db.fieldOption.findFirst.mock.calls[0][0].where).toMatchObject({
        field: { organizationId: ORG },
      });
      expect(db.fieldOption.update).not.toHaveBeenCalled();
    });

    it("soft-deletes once the option is confirmed to be in the organization", async () => {
      db.fieldOption.findFirst.mockResolvedValue({ id: FOREIGN });

      await service.deleteRecordFieldOption(FOREIGN, ORG);

      expect(db.fieldOption.update).toHaveBeenCalled();
    });
  });

  // Reads leak silently, so they matter as much as the destructive paths.
  describe("getHistory", () => {
    it("scopes both the page and the count to the organization", async () => {
      await service.getHistory(FOREIGN, 15, 0, ORG);

      expect(db.history.findMany.mock.calls[0][0].where).toMatchObject({
        record: { organizationId: ORG },
      });
      expect(db.history.count.mock.calls[0][0].where).toMatchObject({
        record: { organizationId: ORG },
      });
    });
  });

  describe("getValueId", () => {
    it("scopes the contact lookup to the organization", async () => {
      await service.getValueId(FOREIGN, "someone", ORG);

      expect(db.field.findFirst.mock.calls[0][0].where).toMatchObject({
        organizationId: ORG,
      });
    });
  });

  describe("createRecordFieldOption", () => {
    it("refuses to attach an option to another organization's field", async () => {
      await expect(
        service.createRecordFieldOption(FOREIGN, "New option", ORG)
      ).rejects.toThrow(NotFoundException);

      expect(db.field.findFirst.mock.calls[0][0].where).toMatchObject({
        organizationId: ORG,
      });
      expect(db.fieldOption.create).not.toHaveBeenCalled();
    });
  });

  // Bull assigns sequential job ids, so a job id alone proves nothing about
  // who queued the work.
  describe("getJobStatus", () => {
    const withQueue = (job: unknown) =>
      new BoardService(
        null as any,
        null as any,
        null as any,
        null as any,
        queueStub(job) as any,
        null as any
      );

    it("refuses a job queued by another organization", async () => {
      const svc = withQueue({
        id: "42",
        data: { organizationId: "org-b" },
        getState: jest.fn(),
      });

      await expect(
        svc.getJobStatus("42", QUEUE_NAMES.CSV_IMPORT, ORG)
      ).rejects.toThrow(NotFoundException);
    });

    it("refuses a job whose payload carries no organization", async () => {
      const svc = withQueue({ id: "42", data: {}, getState: jest.fn() });

      await expect(
        svc.getJobStatus("42", QUEUE_NAMES.CSV_IMPORT, ORG)
      ).rejects.toThrow(NotFoundException);
    });

    it("returns the job once the organization matches", async () => {
      const svc = withQueue({
        id: "42",
        data: { organizationId: ORG },
        progress: 50,
        returnvalue: { imported: 3 },
        getState: jest.fn().mockResolvedValue("completed"),
      });

      await expect(
        svc.getJobStatus("42", QUEUE_NAMES.CSV_IMPORT, ORG)
      ).resolves.toMatchObject({ jobId: "42", status: "completed" });
    });
  });

  describe("getRecordAnalyze", () => {
    it("scopes the record lookup to the organization", async () => {
      db.board.findFirstOrThrow.mockResolvedValue({
        recordName: "Acme",
        assignedUser: null,
      });

      await service.getRecordAnalyze(FOREIGN, ORG);

      expect(db.board.findFirstOrThrow.mock.calls[0][0].where).toMatchObject({
        id: FOREIGN,
        organizationId: ORG,
      });
    });
  });

  describe("updateContactValue", () => {
    it("refuses a field belonging to another organization", async () => {
      const tx = {
        field: { findFirst: jest.fn().mockResolvedValue(null) },
        fieldPersonInformation: { upsert: jest.fn() },
      };
      db.$transaction.mockImplementation((cb: any) => cb(tx));

      await expect(
        service.updateContactValue(FOREIGN, {} as any, ORG)
      ).rejects.toThrow(NotFoundException);

      expect(tx.field.findFirst.mock.calls[0][0].where).toMatchObject({
        organizationId: ORG,
      });
      expect(tx.fieldPersonInformation.upsert).not.toHaveBeenCalled();
    });
  });
});
