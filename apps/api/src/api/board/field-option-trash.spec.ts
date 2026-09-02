// Deleting an option is always a soft delete: records already hold its value,
// so it has to be reversible and it has to say who did it.
// bullmq and the gateway are ESM-flavoured and irrelevant here; the sibling
// board specs stub them the same way so the service can be imported at all.
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));

jest.mock("./board.gateway", () => ({ BoardGateway: jest.fn() }));

jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    field: { findFirst: jest.fn() },
    fieldOption: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";
import { BoardService } from "./board.service";

const ORG = "org-a";
const USER = "user-a";
const OPTION = "option-1";
const FIELD = "field-1";

const db = prisma as unknown as {
  field: { findFirst: jest.Mock };
  fieldOption: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
};

describe("field option trash", () => {
  // None of the injected collaborators are reached by the option paths.
  const service = new BoardService(
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never
  );

  beforeEach(() => jest.clearAllMocks());

  describe("deleteRecordFieldOption", () => {
    it("marks it deleted and records who and when", async () => {
      db.fieldOption.findFirst.mockResolvedValue({
        id: OPTION,
        isDeleted: false,
      });

      await service.deleteRecordFieldOption(OPTION, ORG, USER);

      const [call] = db.fieldOption.update.mock.calls[0];
      expect(call.where).toEqual({ id: OPTION });
      expect(call.data.isDeleted).toBe(true);
      expect(call.data.deletedBy).toBe(USER);
      expect(call.data.deletedAt).toBeInstanceOf(Date);
    });

    it("scopes the lookup to the organization through the field", async () => {
      db.fieldOption.findFirst.mockResolvedValue({
        id: OPTION,
        isDeleted: false,
      });

      await service.deleteRecordFieldOption(OPTION, ORG, USER);

      expect(db.fieldOption.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: OPTION, field: { organizationId: ORG } },
        })
      );
    });

    it("refuses an option from another organization", async () => {
      db.fieldOption.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteRecordFieldOption(OPTION, ORG, USER)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.fieldOption.update).not.toHaveBeenCalled();
    });

    // Otherwise a second delete would overwrite the original deletedBy and
    // misattribute who binned it.
    it("refuses to bin something already in the trash", async () => {
      db.fieldOption.findFirst.mockResolvedValue({
        id: OPTION,
        isDeleted: true,
      });

      await expect(
        service.deleteRecordFieldOption(OPTION, ORG, USER)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.fieldOption.update).not.toHaveBeenCalled();
    });
  });

  describe("restoreRecordFieldOption", () => {
    it("puts it back and clears the delete attribution", async () => {
      db.fieldOption.findFirst.mockResolvedValue({
        id: OPTION,
        isDeleted: true,
      });

      await service.restoreRecordFieldOption(OPTION, ORG);

      expect(db.fieldOption.update).toHaveBeenCalledWith({
        where: { id: OPTION },
        data: { isDeleted: false, deletedAt: null, deletedBy: null },
      });
    });

    it("refuses to restore something that is not in the trash", async () => {
      db.fieldOption.findFirst.mockResolvedValue({
        id: OPTION,
        isDeleted: false,
      });

      await expect(
        service.restoreRecordFieldOption(OPTION, ORG)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.fieldOption.update).not.toHaveBeenCalled();
    });
  });

  describe("getDeletedRecordFieldOptions", () => {
    it("lists only binned options, newest first, with both names", async () => {
      db.field.findFirst.mockResolvedValue({ id: FIELD });
      db.fieldOption.findMany.mockResolvedValue([]);

      await service.getDeletedRecordFieldOptions(FIELD, ORG);

      const [call] = db.fieldOption.findMany.mock.calls[0];
      expect(call.where).toEqual({ fieldId: FIELD, isDeleted: true });
      expect(call.orderBy[0]).toEqual({ deletedAt: "desc" });
      expect(call.select.deleter).toBeDefined();
      expect(call.select.creator).toBeDefined();
    });

    it("refuses a field from another organization", async () => {
      db.field.findFirst.mockResolvedValue(null);

      await expect(
        service.getDeletedRecordFieldOptions(FIELD, ORG)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.fieldOption.findMany).not.toHaveBeenCalled();
    });
  });
});
