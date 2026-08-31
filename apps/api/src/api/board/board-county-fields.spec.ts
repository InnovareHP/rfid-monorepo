// The referral County column used to read and write BoardCounty rows. It is a
// plain field option column now, autofilled from the record's own Location.

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
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    },
    boardCounty: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma/prisma";
import { BoardService } from "./board.service";

const ORG = "org-a";
const COUNTY_FIELD = "field-county";
const LEAD_MODULE = "module-lead";
const REFERRAL_MODULE = "module-referral";

const db = prisma as unknown as {
  field: { findFirst: jest.Mock };
  fieldOption: { findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
  boardCounty: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
};

const newService = () =>
  new BoardService(
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any
  );

describe("referral County as a plain field option column", () => {
  let service: BoardService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.fieldOption.findMany.mockResolvedValue([]);
    db.fieldOption.count.mockResolvedValue(0);
    service = newService();
  });

  describe("getRecordFieldOptions", () => {
    it("reads the referral County options from FieldOption, not BoardCounty", async () => {
      db.field.findFirst.mockResolvedValue({
        fieldName: "County",
        moduleType: "REFERRAL",
      });
      db.fieldOption.findMany.mockResolvedValue([
        { id: "opt-1", optionName: "Springfield County", color: null },
      ]);

      const options = await service.getRecordFieldOptions(
        COUNTY_FIELD,
        ORG,
        null,
        null
      );

      expect(options).toEqual([
        { id: "opt-1", value: "Springfield County", color: null },
      ]);
      expect(db.fieldOption.findMany.mock.calls[0][0].where).toMatchObject({
        fieldId: COUNTY_FIELD,
        isDeleted: false,
      });
      expect(db.boardCounty.findMany).not.toHaveBeenCalled();
    });

    it("paginates referral County like any other option column", async () => {
      db.field.findFirst.mockResolvedValue({
        fieldName: "County",
        moduleType: "REFERRAL",
      });
      db.fieldOption.findMany.mockResolvedValue([]);
      db.fieldOption.count.mockResolvedValue(0);

      const result = await service.getRecordFieldOptions(
        COUNTY_FIELD,
        ORG,
        2,
        25
      );

      expect(result).toMatchObject({ field: "County", total: 0 });
      expect(db.fieldOption.findMany.mock.calls[0][0]).toMatchObject({
        skip: 25,
        take: 25,
      });
      expect(db.boardCounty.findMany).not.toHaveBeenCalled();
    });
  });

  describe("createRecordFieldOption", () => {
    it("writes a field option for a new referral county", async () => {
      db.field.findFirst.mockResolvedValue({
        organizationId: ORG,
        fieldName: "County",
        moduleType: "REFERRAL",
      });

      await service.createRecordFieldOption(COUNTY_FIELD, "Riverton", ORG);

      expect(db.fieldOption.create).toHaveBeenCalledWith({
        data: {
          optionName: "Riverton",
          fieldId: COUNTY_FIELD,
          organizationId: ORG,
        },
      });
      expect(db.boardCounty.create).not.toHaveBeenCalled();
    });
  });
});

// Lead and referral each own a "County" field, so the address autofill has to
// stay inside the module of the record being written.
describe("saveLocationFields module scoping", () => {
  const geocoded = {
    geocoded: true,
    address: "1420 W Elm St, Springfield, IL",
    city: "Springfield",
    state: "IL",
    zip: "62704",
    county: "Sangamon County",
    country: "United States",
  } as const;

  const txStub = (moduleId: string) => ({
    board: { findUniqueOrThrow: jest.fn().mockResolvedValue({ moduleId }) },
    field: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: "referral-county", fieldName: "County" }]),
    },
    fieldValue: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  });

  const save = (
    service: BoardService,
    result: unknown,
    tx: ReturnType<typeof txStub>
  ) =>
    (service as any).saveLocationFields(
      result,
      "1420 W Elm St, Springfield, IL",
      "referral-1",
      ORG,
      tx
    );

  it("only touches fields belonging to the record's module", async () => {
    const tx = txStub(REFERRAL_MODULE);

    await save(newService(), geocoded, tx);

    expect(tx.field.findMany.mock.calls[0][0].where).toMatchObject({
      organizationId: ORG,
      moduleId: REFERRAL_MODULE,
    });
    expect(tx.fieldValue.upsert.mock.calls[0][0].where).toMatchObject({
      recordId_fieldId: { recordId: "referral-1", fieldId: "referral-county" },
    });
  });

  it("scopes the clearing path to the module too", async () => {
    const tx = txStub(LEAD_MODULE);

    await save(newService(), { cleared: true }, tx);

    expect(tx.field.findMany.mock.calls[0][0].where).toMatchObject({
      moduleId: LEAD_MODULE,
    });
    expect(tx.fieldValue.updateMany).toHaveBeenCalled();
  });
});
