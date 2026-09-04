// Deleting a column is a soft delete, so a restore path exists and both ends of
// it have to refuse a name that would shadow a live column: getAllBoards keys
// its rows by fieldName, so two live fields of one name hide each other.
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));

jest.mock("./board.gateway", () => ({ BoardGateway: jest.fn() }));

jest.mock("../../lib/module/system-modules", () => ({
  resolveModuleId: jest.fn().mockResolvedValue("module-lead"),
  toModuleType: jest.fn().mockReturnValue("LEAD"),
}));

jest.mock("src/lib/redis/redis", () => ({
  cacheData: jest.fn(),
  deleteData: jest.fn(),
  getData: jest.fn(),
  purgeBoardCaches: jest.fn(),
}));

jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    field: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { BadRequestException, ConflictException } from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";
import { BoardService } from "./board.service";

const ORG = "org-a";
const MODULE = "module-lead";
const COLUMN = "field-1";

const db = prisma as unknown as {
  field: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
};

const newService = () =>
  new BoardService(
    { emitColumnCreated: jest.fn(), emitColumnDeleted: jest.fn() } as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never
  );

describe("column trash", () => {
  let service: BoardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = newService();
  });

  describe("restoreColumn", () => {
    it("refuses a column that is not in the trash", async () => {
      db.field.findFirst.mockResolvedValue({
        id: COLUMN,
        fieldName: "Notes",
        fieldType: "TEXT",
        isDeleted: false,
      });

      await expect(
        service.restoreColumn(COLUMN, ORG, "LEAD")
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.field.update).not.toHaveBeenCalled();
    });

    it("refuses to restore onto a live column of the same name", async () => {
      db.field.findFirst.mockResolvedValue({
        id: COLUMN,
        fieldName: "Notes",
        fieldType: "TEXT",
        isDeleted: true,
      });
      // The collapse is labelKey's, so casing and spacing still collide.
      db.field.findMany.mockResolvedValue([{ fieldName: "  notes " }]);

      await expect(
        service.restoreColumn(COLUMN, ORG, "LEAD")
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.field.update).not.toHaveBeenCalled();
    });

    it("clears the attribution and puts the column back at the end", async () => {
      db.field.findFirst
        .mockResolvedValueOnce({
          id: COLUMN,
          fieldName: "Notes",
          fieldType: "TEXT",
          isDeleted: true,
        })
        .mockResolvedValueOnce({ fieldOrder: 7 });
      db.field.findMany.mockResolvedValue([{ fieldName: "Owner" }]);

      await service.restoreColumn(COLUMN, ORG, "LEAD");

      expect(db.field.update).toHaveBeenCalledWith({
        where: { id: COLUMN },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          fieldOrder: 8,
        },
      });
    });
  });

  describe("createColumn", () => {
    it("restores a binned column of the same name instead of duplicating it", async () => {
      db.field.findFirst.mockResolvedValue({ fieldOrder: 3 });
      db.field.findMany.mockResolvedValue([{ id: COLUMN, fieldName: "notes" }]);
      db.field.update.mockResolvedValue({
        id: COLUMN,
        fieldName: "Notes",
        fieldType: "TEXT",
      });

      await service.createColumn("Notes", "TEXT" as never, "LEAD", ORG);

      expect(db.field.create).not.toHaveBeenCalled();
      expect(db.field.update).toHaveBeenCalledWith({
        where: { id: COLUMN },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          fieldOrder: 4,
        },
      });
    });

    it("creates a column when nothing binned matches", async () => {
      db.field.findFirst.mockResolvedValue({ fieldOrder: 3 });
      db.field.findMany.mockResolvedValue([]);
      db.field.create.mockResolvedValue({
        id: "field-2",
        fieldName: "Notes",
        fieldType: "TEXT",
      });

      await service.createColumn("Notes", "TEXT" as never, "LEAD", ORG);

      expect(db.field.create).toHaveBeenCalled();
      expect(db.field.update).not.toHaveBeenCalled();
    });
  });

  it("keeps the module scope on the trash listing", async () => {
    db.field.findMany.mockResolvedValue([]);

    await service.getDeletedColumns("LEAD", ORG);

    expect(db.field.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG, moduleId: MODULE, isDeleted: true },
      })
    );
  });
});
