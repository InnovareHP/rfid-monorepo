import { describe, expect, it } from "vitest";
import { resolveFaxAutofill } from "./fax-autofill";

describe("resolveFaxAutofill", () => {
  it("returns field id and value when a Fax text field has a value", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Fax", type: "TEXT" }],
      { Fax: "+15551234567" }
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "+15551234567" });
  });

  it("matches field names case-insensitively and trims them", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "FAX ", type: "TEXT" }],
      { "FAX ": "+15551234567" }
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "+15551234567" });
  });

  it("matches 'fax number' field name", () => {
    const result = resolveFaxAutofill(
      [{ id: "f2", name: "Fax Number", type: "PHONE" }],
      { "Fax Number": "+15559876543" }
    );
    expect(result).toEqual({ faxFieldId: "f2", existingFax: "+15559876543" });
  });

  it("trims surrounding whitespace from the record value", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Fax", type: "TEXT" }],
      { Fax: "  +15551234567  " }
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "+15551234567" });
  });

  it("returns null field id for an empty columns array", () => {
    const result = resolveFaxAutofill([], { Fax: "+15551234567" });
    expect(result).toEqual({ faxFieldId: null, existingFax: "" });
  });

  it("returns empty existingFax for whitespace-only value", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Fax", type: "TEXT" }],
      { Fax: "   " }
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "" });
  });

  it("returns empty existingFax for null value", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Fax", type: "TEXT" }],
      { Fax: null }
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "" });
  });

  it("returns empty existingFax for non-string value", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Fax", type: "TEXT" }],
      { Fax: 5551234567 }
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "" });
  });

  it("returns null field id when no fax column exists", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Status", type: "STATUS" }],
      { Status: "Active" }
    );
    expect(result).toEqual({ faxFieldId: null, existingFax: "" });
  });

  it("uses the first matching column when multiple fax columns exist", () => {
    const result = resolveFaxAutofill(
      [
        { id: "f1", name: "Fax", type: "TEXT" },
        { id: "f2", name: "Fax Number", type: "TEXT" },
      ],
      { Fax: "+15551111111", "Fax Number": "+15552222222" }
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "+15551111111" });
  });

  it("treats a non-text-like fax column as absent", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Fax", type: "CHECKBOX" }],
      { Fax: true }
    );
    expect(result).toEqual({ faxFieldId: null, existingFax: "" });
  });

  it("handles undefined columns", () => {
    const result = resolveFaxAutofill(undefined, { Fax: "+15551234567" });
    expect(result).toEqual({ faxFieldId: null, existingFax: "" });
  });

  it("returns field id with empty value when record is undefined", () => {
    const result = resolveFaxAutofill(
      [{ id: "f1", name: "Fax", type: "TEXT" }],
      undefined
    );
    expect(result).toEqual({ faxFieldId: "f1", existingFax: "" });
  });
});
