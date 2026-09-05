// BoardService reaches auth.ts through the gateway, which pulls in an ESM-only
// package jest cannot transform. Same cut as board.tenant-isolation.spec.
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));
jest.mock("./board.gateway", () => ({ BoardGateway: jest.fn() }));

const findMany = jest.fn();
const moduleFindFirst = jest.fn();
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    member: { findMany: (...a: unknown[]) => findMany(...a) },
    module: { findFirst: (...a: unknown[]) => moduleFindFirst(...a) },
  },
}));

import { BoardExportService } from "./board-export.service";

const getAllBoards = jest.fn();
const record = jest.fn();

const service = () =>
  new BoardExportService({ getAllBoards } as any, { record } as any);

const actor = { userId: "user_a", role: "owner", ip: "10.0.0.5" };

const lines = (csv: string) => csv.replace(/^\uFEFF/, "").split("\r\n");

describe("BoardExportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([{ userId: "u1", user: { name: "Dana Reed" } }]);
    moduleFindFirst.mockResolvedValue({
      key: "LEAD",
      label: "Master Marketing List",
      labelSingular: "Lead",
    });
  });

  it("prepends the BOM so Excel reads utf-8", async () => {
    getAllBoards.mockResolvedValue({ data: [{}], columns: [] });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD" },
      actor
    );

    expect(csv.startsWith("﻿")).toBe(true);
  });

  // recordName and assignedTo are the keys getAllBoards actually puts on a flat
  // row; reading referral_name/assigned_to exported both columns blank.
  it("drops the History column and resolves the assignee name", async () => {
    getAllBoards.mockResolvedValue({
      data: [{ recordName: "Acme", assignedTo: "u1", Stage: "New" }],
      columns: [{ name: "Stage" }, { name: "History" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD" },
      actor
    );

    expect(lines(csv)[0]).toBe("Lead,Account Manager,Stage");
    expect(lines(csv)[1]).toBe("Acme,Dana Reed,New");
  });

  // Every module exports its record name, headed by that module's own label.
  it("heads the name column with the module label", async () => {
    moduleFindFirst.mockResolvedValue({
      key: "FACILITY",
      label: "Facilities",
      labelSingular: "Facility",
    });
    getAllBoards.mockResolvedValue({
      data: [{ recordName: "Lakeside", Stage: "New" }],
      columns: [{ name: "Stage" }],
    });

    const { csv, filename } = await service().exportCsv(
      "org_a",
      { moduleType: "FACILITY" },
      actor
    );

    expect(lines(csv)[0]).toBe("Facility,Stage");
    expect(filename).toMatch(/^Facilities_/);
  });

  // REFERRAL owns a field literally called "Facility"; a module whose label
  // collides with one of its own fields must not emit that column twice.
  it("does not repeat a column that matches the module label", async () => {
    moduleFindFirst.mockResolvedValue({
      key: "REFERRAL",
      label: "Referral Logs",
      labelSingular: "Facility",
    });
    getAllBoards.mockResolvedValue({
      data: [{ recordName: "Acme", Facility: "ignored" }],
      columns: [{ name: "Facility" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "REFERRAL" },
      actor
    );

    expect(lines(csv)[0]).toBe("Facility");
    expect(lines(csv)[1]).toBe("Acme");
  });

  // getAllBoards resolves a link cell to the target's recordName before it
  // builds the flat row, so a link column exports as that name, not an id.
  it("exports link columns for a crm module", async () => {
    moduleFindFirst.mockResolvedValue({
      key: "CONTACT",
      label: "Phonebook",
      labelSingular: "Contact",
    });
    getAllBoards.mockResolvedValue({
      data: [
        {
          recordName: "Dana Reed",
          assignedTo: "u1",
          Company: "Acme Health",
          Facility: "Lakeside",
        },
      ],
      columns: [
        { name: "Company", type: "COMPANY_LINK" },
        { name: "Facility", type: "REFERRAL_LINK" },
      ],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "CONTACT" },
      actor
    );

    expect(lines(csv)[0]).toBe("Contact,Company,Facility");
    expect(lines(csv)[1]).toBe("Dana Reed,Acme Health,Lakeside");
  });

  // The browser loops pages and joins them, so only the first page may carry
  // the BOM and the header row.
  it("writes the header on the first page only and reports more pages", async () => {
    getAllBoards.mockResolvedValue({
      data: [{ recordName: "Acme", Stage: "New" }],
      columns: [{ name: "Stage" }],
      pagination: { count: 3 },
    });

    const first = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD", page: 1, limit: 1 },
      actor
    );
    const second = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD", page: 2, limit: 1 },
      actor
    );
    const last = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD", page: 3, limit: 1 },
      actor
    );

    expect(first.csv.startsWith("\ufeff")).toBe(true);
    expect(lines(first.csv)[0]).toBe("Lead,Account Manager,Stage");
    expect(first.hasMore).toBe(true);
    expect(second.csv).toBe("Acme,,New");
    expect(second.hasMore).toBe(true);
    expect(last.hasMore).toBe(false);
  });

  it("rejects a module the organization does not own", async () => {
    moduleFindFirst.mockResolvedValue(null);

    await expect(
      service().exportCsv("org_a", { moduleType: "NOPE" }, actor)
    ).rejects.toThrow('No module "NOPE" for the active organization');
  });

  // Papa quotes only when it has to, and doubles an embedded quote. A field that
  // round-trips wrong here corrupts every downstream column on that row.
  it.each([
    ["plain", "plain"],
    ["has,comma", '"has,comma"'],
    ['has"quote', '"has""quote"'],
    ["has\nnewline", '"has\nnewline"'],
    ["", ""],
  ])("serialises %j as %j", async (value, expected) => {
    getAllBoards.mockResolvedValue({
      data: [{ Stage: value }],
      columns: [{ name: "Stage" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD" },
      actor
    );

    expect(lines(csv)[1]).toBe(`,,${expected}`);
  });

  // A LOCATION value arrives as an object; default stringification would have
  // written [object Object] into the cell.
  it("serialises an object value as json, not [object Object]", async () => {
    getAllBoards.mockResolvedValue({
      data: [{ Site: { label: "Clinic", lat: 1 } }],
      columns: [{ name: "Site" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD" },
      actor
    );

    expect(lines(csv)[1]).toBe(',,"{""label"":""Clinic"",""lat"":1}"');
  });

  it("renders a missing value as empty rather than undefined", async () => {
    getAllBoards.mockResolvedValue({
      data: [{}],
      columns: [{ name: "Stage" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD" },
      actor
    );

    expect(lines(csv)[1]).toBe(",,");
  });

  // The reason the endpoint exists: one row naming the export and its size.
  it("audits the export with a row count", async () => {
    getAllBoards.mockResolvedValue({
      data: [{ Stage: "a" }, { Stage: "b" }],
      columns: [{ name: "Stage" }],
    });

    await service().exportCsv(
      "org_a",
      { moduleType: "LEAD", boardDateFrom: "2026-01-01" },
      actor
    );

    expect(record.mock.calls[0][0]).toMatchObject({
      action: "board.export",
      actorUserId: "user_a",
      actorOrgId: "org_a",
      resourceType: "Board",
      metadata: {
        moduleType: "LEAD",
        page: 1,
        rows: 2,
        boardDateFrom: "2026-01-01",
      },
    });
  });

  it("keeps the search term out of the audit row", async () => {
    getAllBoards.mockResolvedValue({ data: [], columns: [] });

    await service().exportCsv(
      "org_a",
      { moduleType: "LEAD", search: "Jane Patient" },
      actor
    );

    const { metadata } = record.mock.calls[0][0];
    expect(metadata.search).toBe("[redacted]");
    expect(JSON.stringify(metadata)).not.toContain("Jane");
  });
});
