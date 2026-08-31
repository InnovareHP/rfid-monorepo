import { z } from "zod";

// Operators run against decrypted strings in memory, never in SQL, because
// FieldValue.value is encrypted at rest.
export const FILTER_OPERATORS = [
  "eq",
  "neq",
  "contains",
  "in",
  "gt",
  "lt",
  "isEmpty",
  "isNotEmpty",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const FilterConditionSchema = z.object({
  fieldId: z.string().uuid(),
  operator: z.enum(FILTER_OPERATORS),
  // Unused by isEmpty and isNotEmpty; a comma-separated list for `in`.
  value: z.string().default(""),
});

// conditions is required, not defaulted: a defaulted key would let the legacy
// { fieldId: value } shape parse as an empty new-shape filter, and parseFilter
// would never reach the conversion below.
export const AnalyticFilterSchema = z.object({
  match: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(FilterConditionSchema).max(20),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export type AnalyticFilter = z.infer<typeof AnalyticFilterSchema>;

export const EMPTY_FILTER: AnalyticFilter = { match: "AND", conditions: [] };

// Rows written before the condition migration hold `{ fieldId: value }` with
// implicit AND equality. This is the only place that shape is understood, and
// it can go once every row has been migrated.
const LegacyFilterSchema = z.record(z.string(), z.string());

export const parseFilter = (stored: unknown): AnalyticFilter => {
  const parsed = AnalyticFilterSchema.safeParse(stored);
  if (parsed.success) return parsed.data;

  const legacy = LegacyFilterSchema.safeParse(stored);
  if (!legacy.success) return EMPTY_FILTER;

  return {
    match: "AND",
    conditions: Object.entries(legacy.data)
      .filter(([, value]) => value)
      .map(([fieldId, value]) => ({ fieldId, operator: "eq" as const, value })),
  };
};

// Every field a filter reads must be loaded with the record, or its value
// arrives undefined and the condition silently drops every row.
export const filterFieldIds = (filter: AnalyticFilter): string[] => [
  ...new Set(filter.conditions.map((condition) => condition.fieldId)),
];

const numeric = (value: string | null, against: string) => {
  const left = Number(value);
  const right = Number(against);
  return Number.isNaN(left) || Number.isNaN(right) ? null : { left, right };
};

const matchesCondition = (
  condition: FilterCondition,
  value: string | null
): boolean => {
  switch (condition.operator) {
    case "eq":
      return value === condition.value;
    case "neq":
      return value !== condition.value;
    case "contains":
      return (value ?? "")
        .toLowerCase()
        .includes(condition.value.toLowerCase());
    case "in":
      return condition.value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .includes(value ?? "");
    case "gt": {
      const pair = numeric(value, condition.value);
      return pair !== null && pair.left > pair.right;
    }
    case "lt": {
      const pair = numeric(value, condition.value);
      return pair !== null && pair.left < pair.right;
    }
    case "isEmpty":
      return value === null || value === "";
    case "isNotEmpty":
      return value !== null && value !== "";
  }
};

// An empty condition list matches everything, so an unfiltered chart stays
// unfiltered under either match mode.
export const matchesFilter = (
  filter: AnalyticFilter,
  values: Record<string, string | null>
): boolean => {
  if (filter.conditions.length === 0) return true;

  const test = (condition: FilterCondition) =>
    matchesCondition(condition, values[condition.fieldId] ?? null);

  return filter.match === "OR"
    ? filter.conditions.some(test)
    : filter.conditions.every(test);
};
