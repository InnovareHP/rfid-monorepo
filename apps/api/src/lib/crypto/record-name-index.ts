import { createHmac } from "crypto";
import { derivePurposeKey } from "./crypto";

// recordName is encrypted at rest with a random IV, so two rows holding the
// same name have different ciphertext and no unique index or SQL equality can
// see the collision. Matching goes through keyed blind indexes instead, the
// same construction the marketing email index uses.
//
// Two of them, because they answer different questions:
//   exact - is this the same name? Blocks the write.
//   fuzzy - is this probably the same place written differently? Flags it.
// Similarity cannot survive a hash, so the fuzzy index is an exact match on a
// harder-normalized form rather than a distance calculation.

// Casing, surrounding space and repeated inner space are not what makes two
// records different.
export const normalizeRecordName = (recordName: string): string =>
  recordName.trim().toLowerCase().replace(/\s+/g, " ");

// Legal suffixes and facility nouns that carry no identity on their own: the
// same facility is filed as "St. Mary's Care Center", "St Marys Care Center"
// and "St. Marys Care Center, LLC" often enough to be the common duplicate.
const NOISE_TOKENS = new Set([
  "inc",
  "llc",
  "llp",
  "ltd",
  "co",
  "corp",
  "corporation",
  "company",
  "the",
  "of",
  "and",
]);

export const normalizeRecordNameLoose = (recordName: string): string =>
  normalizeRecordName(recordName)
    .normalize("NFKD")
    // Strip diacritics so an accented name matches its plain spelling.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    // Apostrophes are dropped rather than spaced: "mary's" is one word, and
    // splitting it would stop it matching "marys".
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !NOISE_TOKENS.has(token))
    .join(" ");

const index = (purpose: string, value: string) =>
  createHmac("sha256", derivePurposeKey(purpose)).update(value).digest("hex");

export const recordNameIndex = (recordName: string): string =>
  index("board-record-name-index", normalizeRecordName(recordName));

export const recordNameFuzzyIndex = (recordName: string): string =>
  index("board-record-name-fuzzy-index", normalizeRecordNameLoose(recordName));

export type RecordNameIndexes = {
  recordNameHash: string | null;
  recordNameFuzzyHash: string | null;
};

// An empty name carries no identity, so it is left unindexed rather than
// collapsing every blank record onto one hash and blocking the second one.
export const recordNameIndexes = (
  recordName: string | null | undefined
): RecordNameIndexes => {
  if (!recordName || !normalizeRecordName(recordName)) {
    return { recordNameHash: null, recordNameFuzzyHash: null };
  }

  const loose = normalizeRecordNameLoose(recordName);

  return {
    recordNameHash: recordNameIndex(recordName),
    // A name that is nothing but noise tokens has no fuzzy identity either.
    recordNameFuzzyHash: loose ? recordNameFuzzyIndex(recordName) : null,
  };
};
