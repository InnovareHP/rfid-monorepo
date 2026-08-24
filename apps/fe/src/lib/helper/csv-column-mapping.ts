import type { ImportColumn } from "@/services/lead/lead-service";
import { normalizeKey } from "@dashboard/shared";

// shadcn Select cannot hold an empty string value, so "ignore" needs a sentinel.
export const IGNORE_COLUMN = "__ignore__";

// A header the user wants added as a brand new field rather than mapped.
export const CREATE_COLUMN = "__create__";

// Filler words only. Deliberately tiny, and deliberately excluding
// "no"/"num"/"number": dropping those would collapse "Number of Beds" into
// "Beds", which is a different question and must never auto-match.
const STOPWORDS = new Set(["of", "the", "a", "an", "for"]);

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !STOPWORDS.has(token));

// Sorted multiset, so word order stops mattering ("Facility Type" ===
// "Type of Facility") while a repeated word still counts as two tokens.
const tokenSetKey = (value: string): string => tokenize(value).sort().join(" ");

export type ColumnSuggestion = { id: string; name: string; score: number };

// 1/3 is the canonical near-miss: one shared token against a three token union,
// which is exactly the typo case ("Faclity Type" vs "Type of Facility"). A
// single word shared across a five token union scores 0.2 and stays out.
export const SUGGESTION_THRESHOLD = 0.33;

const MAX_SUGGESTIONS = 3;

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;

  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;

  return shared / (a.size + b.size - shared);
};

// Exact key first, then token set. Both passes claim the field id they use, so
// two headers can never auto-match onto one field.
export function autoMatchColumns(
  headers: string[],
  columns: ImportColumn[]
): Record<string, string> {
  const byExactKey = new Map(columns.map((c) => [normalizeKey(c.name), c.id]));

  // Two distinct fields reducing to the same token set makes either pick a coin
  // flip, so null poisons the entry and neither is auto-matched.
  const byTokenKey = new Map<string, string | null>();
  for (const column of columns) {
    const key = tokenSetKey(column.name);
    if (!key) continue;
    byTokenKey.set(key, byTokenKey.has(key) ? null : column.id);
  }

  const map: Record<string, string> = {};
  const claimed = new Set<string>();

  for (const header of headers) {
    const fieldId = byExactKey.get(normalizeKey(header));
    if (!fieldId || claimed.has(fieldId)) continue;
    map[header] = fieldId;
    claimed.add(fieldId);
  }

  for (const header of headers) {
    if (map[header]) continue;
    const fieldId = byTokenKey.get(tokenSetKey(header));
    if (!fieldId || claimed.has(fieldId)) continue;
    map[header] = fieldId;
    claimed.add(fieldId);
  }

  return map;
}

// Ranked near-misses for an unmapped header. Never applied automatically, and
// never offering a field another header already took.
export function suggestColumns(
  header: string,
  columns: ImportColumn[],
  takenFieldIds: Set<string>
): ColumnSuggestion[] {
  const headerTokens = new Set(tokenize(header));
  if (!headerTokens.size) return [];

  return columns
    .filter((column) => !takenFieldIds.has(column.id))
    .map((column) => ({
      id: column.id,
      name: column.name,
      score: jaccard(headerTokens, new Set(tokenize(column.name))),
    }))
    .filter((suggestion) => suggestion.score >= SUGGESTION_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_SUGGESTIONS);
}

// Types the importer can actually populate from a cell. TIMELINE, LOCATION,
// ASSIGNED_TO, PERSON and the *_LINK types need a related row, not a string.
export const NEW_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "DATE",
  "EMAIL",
  "PHONE",
  "CHECKBOX",
  "DROPDOWN",
  "MULTISELECT",
] as const;

export type NewFieldType = (typeof NEW_FIELD_TYPES)[number];

const SAMPLE_SIZE = 50;

// Requires a separator, so a bare "5" is never read as a year.
const DATE_SHAPE = /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}([T ]\d{1,2}:\d{2}.*)?$/;

const isNumeric = (text: string) => Number.isFinite(Number(text));

const isDateLike = (text: string) =>
  DATE_SHAPE.test(text) && !Number.isNaN(Date.parse(text));

// Conservative on purpose: TEXT holds anything, so only a column where every
// sampled cell agrees earns a narrower type. DROPDOWN is never inferred because
// a cardinality guess is wrong often and drags FieldOption rows in with it.
export function inferFieldType(values: unknown[]): NewFieldType {
  const samples: string[] = [];

  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (!text) continue;

    samples.push(text);
    if (samples.length >= SAMPLE_SIZE) break;
  }

  if (!samples.length) return "TEXT";
  if (samples.every(isNumeric)) return "NUMBER";
  if (samples.every(isDateLike)) return "DATE";

  return "TEXT";
}
