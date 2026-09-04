// Renaming Rejected to Denied moves the FieldValue rows, but a saved chart
// holds the option name as a literal in its filter JSON. Miss that and the
// denial charts quietly report zero.
import { renameOptionInFilter } from "./status-option-rename";

const FIELD = "field-status";
const OTHER = "field-payor";

describe("renameOptionInFilter", () => {
  it("rewrites the option on a matching condition", () => {
    const result = renameOptionInFilter(
      {
        match: "AND",
        conditions: [{ fieldId: FIELD, operator: "eq", value: "Rejected" }],
      },
      FIELD,
      "Rejected",
      "Denied"
    );

    expect(result).toEqual({
      match: "AND",
      conditions: [{ fieldId: FIELD, operator: "eq", value: "Denied" }],
    });
  });

  it("rewrites only the named entry inside an in-list", () => {
    const result = renameOptionInFilter(
      {
        match: "AND",
        conditions: [
          { fieldId: FIELD, operator: "in", value: "Pending,Rejected" },
        ],
      },
      FIELD,
      "Rejected",
      "Denied"
    );

    expect(result?.conditions?.[0].value).toBe("Pending,Denied");
  });

  it("collapses a list that already names both", () => {
    const result = renameOptionInFilter(
      {
        match: "AND",
        conditions: [
          { fieldId: FIELD, operator: "in", value: "Rejected,Denied" },
        ],
      },
      FIELD,
      "Rejected",
      "Denied"
    );

    expect(result?.conditions?.[0].value).toBe("Denied");
  });

  it("leaves conditions on other fields alone", () => {
    const result = renameOptionInFilter(
      {
        match: "AND",
        conditions: [{ fieldId: OTHER, operator: "eq", value: "Rejected" }],
      },
      FIELD,
      "Rejected",
      "Denied"
    );

    expect(result).toBeNull();
  });

  // Null tells the caller to skip the write rather than churn every row.
  it("returns null when nothing changes", () => {
    expect(
      renameOptionInFilter(
        {
          match: "AND",
          conditions: [{ fieldId: FIELD, operator: "eq", value: "Admitted" }],
        },
        FIELD,
        "Rejected",
        "Denied"
      )
    ).toBeNull();
    expect(
      renameOptionInFilter({ match: "AND", conditions: [] }, FIELD, "a", "b")
    ).toBeNull();
    expect(renameOptionInFilter(null, FIELD, "a", "b")).toBeNull();
  });
});
