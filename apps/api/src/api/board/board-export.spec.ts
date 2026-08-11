// BoardService reaches auth.ts through the gateway, which pulls in an ESM-only
// package jest cannot transform. Same cut as board.tenant-isolation.spec.
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));
jest.mock("./board.gateway", () => ({ BoardGateway: jest.fn() }));

const findMany = jest.fn();
jest.mock("../../lib/prisma/prisma", () => ({
  prisma: { member: { findMany: (...a: unknown[]) => findMany(...a) } },
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
  });

  it("prepends the BOM so Excel reads utf-8", async () => {
    getAllBoards.mockResolvedValue({ data: [{}], columns: [] });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD" },
      actor
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("drops the History column and resolves the assignee name", async () => {
    getAllBoards.mockResolvedValue({
      data: [{ referral_name: "Acme", assigned_to: "u1", Stage: "New" }],
      columns: [{ name: "Stage" }, { name: "History" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "LEAD" },
      actor
    );

    expect(lines(csv)[0]).toBe("Organization,Account Manager,Stage");
    expect(lines(csv)[1]).toBe("Acme,Dana Reed,New");
  });

  it("omits the lead-only columns for referrals", async () => {
    getAllBoards.mockResolvedValue({
      data: [{ Stage: "New" }],
      columns: [{ name: "Stage" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "REFERRAL" },
      actor
    );

    expect(lines(csv)[0]).toBe("Stage");
    expect(findMany).not.toHaveBeenCalled();
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
      { moduleType: "REFERRAL" },
      actor
    );

    expect(csv.replace(/^\uFEFF/, "").split("\r\n")[1]).toBe(expected);
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
      { moduleType: "REFERRAL" },
      actor
    );

    expect(lines(csv)[1]).toBe('"{""label"":""Clinic"",""lat"":1}"');
  });

  it("renders a missing value as empty rather than undefined", async () => {
    getAllBoards.mockResolvedValue({
      data: [{}],
      columns: [{ name: "Stage" }],
    });

    const { csv } = await service().exportCsv(
      "org_a",
      { moduleType: "REFERRAL" },
      actor
    );

    expect(lines(csv)[1]).toBe("");
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
      metadata: { moduleType: "LEAD", rows: 2, boardDateFrom: "2026-01-01" },
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
