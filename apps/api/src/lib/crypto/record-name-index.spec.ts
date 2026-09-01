import {
  normalizeRecordName,
  normalizeRecordNameLoose,
} from "./record-name-index";

// The normalizers are what decide whether two records are the same, so they
// are tested directly. The hashing around them is a keyed HMAC and needs no
// coverage of its own: equal input gives equal digest.

describe("normalizeRecordName - what blocks a write", () => {
  const canonical = normalizeRecordName("ALI RESIDENTIAL SERVICES");

  it.each([
    "ALI RESIDENTIAL SERVICES",
    "ali residential services",
    "  ALI   RESIDENTIAL  SERVICES  ",
    "Ali Residential Services",
  ])("treats %j as the same record", (name) => {
    expect(normalizeRecordName(name)).toBe(canonical);
  });

  it("keeps a genuinely different name distinct", () => {
    expect(normalizeRecordName("ALI RESIDENTIAL SERVICES sample")).not.toBe(
      canonical
    );
  });

  it("does not collapse punctuation, which only the fuzzy form ignores", () => {
    expect(normalizeRecordName("Ali Residential Services, LLC")).not.toBe(
      canonical
    );
  });
});

describe("normalizeRecordNameLoose - what raises a near-match flag", () => {
  const canonical = normalizeRecordNameLoose("ALI RESIDENTIAL SERVICES");

  it.each([
    "Ali Residential Services, LLC",
    "ali residential services inc",
    "ALI RESIDENTIAL SERVICES.",
  ])("flags %j as probably the same record", (name) => {
    expect(normalizeRecordNameLoose(name)).toBe(canonical);
  });

  it("matches across apostrophes, so St. Mary's finds St Marys", () => {
    expect(normalizeRecordNameLoose("St. Mary's Care Center")).toBe(
      normalizeRecordNameLoose("St Marys Care Center")
    );
  });

  it("matches across an ampersand written as a word", () => {
    expect(normalizeRecordNameLoose("Smith & Sons Care")).toBe(
      normalizeRecordNameLoose("Smith and Sons Care")
    );
  });

  it("matches across diacritics", () => {
    expect(normalizeRecordNameLoose("Résidence Beauséjour")).toBe(
      normalizeRecordNameLoose("Residence Beausejour")
    );
  });

  it("does not flag an extra meaningful word as the same record", () => {
    expect(
      normalizeRecordNameLoose("ALI RESIDENTIAL SERVICES sample")
    ).not.toBe(canonical);
  });

  it("leaves a name that is only noise tokens empty, so it is never indexed", () => {
    expect(normalizeRecordNameLoose("The Inc")).toBe("");
  });
});
