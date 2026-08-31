import {
  BAA_CLAUSES,
  BAA_SECTIONS,
  BAA_VERSION,
  buildBaaPreamble,
  hasFeature,
  isBaaCurrent,
} from "@dashboard/shared";

const party = {
  companyLegalName: "Acme Health Services, Inc.",
  companyJurisdiction: "Ohio",
  companyEntityType: "Corporation",
  companyAddress: "100 Main St, Columbus, OH 43004",
};

describe("BAA terms", () => {
  it("gates the agreement on the top tier only", () => {
    expect(hasFeature("essentials", "hipaa")).toBe(false);
    expect(hasFeature("growth", "hipaa")).toBe(false);
    expect(hasFeature("scale", "hipaa")).toBe(true);
  });

  it("grants nothing when the plan is missing or unknown", () => {
    expect(hasFeature(null, "hipaa")).toBe(false);
    expect(hasFeature("enterprise", "hipaa")).toBe(false);
  });

  // The gate is a version match, so a bump reads as unsigned until re-signed.
  it("treats an older signed version as unsigned", () => {
    expect(isBaaCurrent(new Date(), BAA_VERSION)).toBe(true);
    expect(isBaaCurrent(new Date(), "2020-01-01")).toBe(false);
    expect(isBaaCurrent(null, BAA_VERSION)).toBe(false);
    expect(isBaaCurrent(new Date(), null)).toBe(false);
  });

  it("names both parties in the preamble", () => {
    const preamble = buildBaaPreamble(party);

    expect(preamble).toContain("Acme Health Services, Inc.");
    expect(preamble).toContain("Ohio Corporation");
    expect(preamble).toContain("100 Main St, Columbus, OH 43004");
    expect(preamble).toContain("Covered Entity");
    expect(preamble).toContain("Business Associate");
  });

  it("picks the article from the jurisdiction", () => {
    expect(buildBaaPreamble(party)).toContain("an Ohio");
    expect(
      buildBaaPreamble({ ...party, companyJurisdiction: "Delaware" })
    ).toContain("a Delaware");
  });

  // The clause list is a summary of the document, not the document; a section
  // added without a summary is the drift this catches. Not an equality: the
  // summary is deliberately more granular than the section headings, so it may
  // run longer, but it can never fall behind the number of sections.
  it("keeps a summary for every section of the agreement", () => {
    expect(BAA_CLAUSES.length).toBeGreaterThanOrEqual(BAA_SECTIONS.length);
  });

  it("has no blank or repeated clause", () => {
    for (const clause of BAA_CLAUSES) {
      expect(clause.trim()).not.toBe("");
    }

    expect(new Set(BAA_CLAUSES).size).toBe(BAA_CLAUSES.length);
  });
});
