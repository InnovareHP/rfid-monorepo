import { MARKETING_IMPORT_BATCH_SIZE } from "@dashboard/shared";
import { describe, expect, it } from "vitest";
import { parseImportRows, toBatches } from "./marketing-import";

const LOG_HEADERS = ["Date", "Facility", "Talked To", "Touchpoints", "Notes"];

const logRow = (overrides: Record<string, unknown> = {}) => ({
  Date: "2025-03-04",
  Facility: "Lakeside Senior Living",
  "Talked To": "Front desk",
  Touchpoints: "In Person; phone",
  Notes: "Liaison: Amy",
  ...overrides,
});

describe("parseImportRows", () => {
  it("reads a log row, matching touchpoint labels in any case", () => {
    const { rows, errors } = parseImportRows("logs", LOG_HEADERS, [logRow()]);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        date: "2025-03-04",
        facility: "Lakeside Senior Living",
        talkedTo: "Front desk",
        touchpoints: ["IN_PERSON_MEETING", "PHONE"],
        notes: "Liaison: Amy",
      },
    ]);
  });

  it("matches headers regardless of case and spacing", () => {
    const headers = ["date", "FACILITY", "talked to", "touch points", "notes"];
    const row = {
      date: "2025-03-04",
      FACILITY: "Lakeside",
      "talked to": "",
      "touch points": "TEXT",
      notes: "",
    };

    const { rows, errors } = parseImportRows("logs", headers, [row]);

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("reports missing columns instead of guessing", () => {
    const { rows, errors } = parseImportRows(
      "logs",
      ["Date", "Facility"],
      [logRow()]
    );

    expect(rows).toEqual([]);
    expect(errors[0].message).toContain("Talked To");
  });

  it("flags bad rows with their spreadsheet line number", () => {
    const { rows, errors } = parseImportRows("logs", LOG_HEADERS, [
      logRow(),
      logRow({ Date: "3/4/2025" }),
      logRow({ Touchpoints: "Carrier pigeon" }),
      logRow({ Touchpoints: "Email (Blast)" }),
      logRow({ Facility: " " }),
    ]);

    expect(rows).toHaveLength(1);
    expect(errors.map((error) => error.row)).toEqual([3, 4, 5, 6]);
  });

  it("reads a workbook date cell on its local calendar day", () => {
    const { rows } = parseImportRows("logs", LOG_HEADERS, [
      logRow({ Date: new Date(2025, 2, 4) }),
    ]);

    expect(rows[0]).toMatchObject({ date: "2025-03-04" });
  });

  it("lowercases account manager emails and rejects malformed ones", () => {
    const headers = ["Facility", "Account Manager Email"];
    const { rows, errors } = parseImportRows("managers", headers, [
      { Facility: "Lakeside", "Account Manager Email": "Rich@Example.com" },
      { Facility: "Lakeside", "Account Manager Email": "not-an-email" },
    ]);

    expect(rows).toEqual([{ facility: "Lakeside", email: "rich@example.com" }]);
    expect(errors).toEqual([{ row: 3, message: "Email is not valid" }]);
  });
});

describe("toBatches", () => {
  it("splits rows into batches of the shared size, keeping order", () => {
    const items = Array.from(
      { length: MARKETING_IMPORT_BATCH_SIZE * 2 + 1 },
      (_, index) => index
    );

    const batches = toBatches(items);

    expect(batches.map((batch) => batch.length)).toEqual([
      MARKETING_IMPORT_BATCH_SIZE,
      MARKETING_IMPORT_BATCH_SIZE,
      1,
    ]);
    expect(batches.flat()).toEqual(items);
  });
});
