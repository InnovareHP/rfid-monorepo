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
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
  };
  const fieldOption = {
    findFirst: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  };
  const field = { findFirst: jest.fn() };

  return {
    prisma: {
      history,
      fieldOption,
      field,
      $transaction: jest.fn(),
    },
  };
});

import { prisma } from "../../lib/prisma/prisma";
import { BoardService } from "./board.service";

const ORG = "org-a";
const FOREIGN = "row-owned-by-org-b";

const db = prisma as unknown as {
  history: { findFirst: jest.Mock; updateMany: jest.Mock; delete: jest.Mock };
  fieldOption: { findFirst: jest.Mock; update: jest.Mock };
  field: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

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
      await expect(
        service.deleteRecordHistory(FOREIGN, ORG)
      ).rejects.toThrow(NotFoundException);

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
