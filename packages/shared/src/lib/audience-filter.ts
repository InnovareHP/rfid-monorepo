// Group audience conditions, shared so the editor labels and the API matcher agree.
export const FILTER_OPERATORS = [
  "contains",
  "not_contains",
  "is",
  "is_not",
  "is_empty",
  "is_not_empty",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  not_contains: "does not contain",
  is: "is",
  is_not: "is not",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

export const operatorNeedsValue = (operator: FilterOperator) =>
  operator !== "is_empty" && operator !== "is_not_empty";

// Pick-list fields compare whole values; saved groups without an operator use this.
export const defaultFilterOperator = (fieldType?: string): FilterOperator =>
  fieldType === "DROPDOWN" || fieldType === "STATUS" || fieldType === "CHECKBOX"
    ? "is"
    : "contains";

// Case-insensitive; a record with no value for the field counts as empty.
export const matchesFilter = (
  operator: FilterOperator,
  value: string | null | undefined,
  needle: string
): boolean => {
  const hay = (value ?? "").trim().toLowerCase();
  const want = needle.trim().toLowerCase();

  switch (operator) {
    case "contains":
      return hay.includes(want);
    case "not_contains":
      return !hay.includes(want);
    case "is":
      return hay === want;
    case "is_not":
      return hay !== want;
    case "is_empty":
      return hay === "";
    case "is_not_empty":
      return hay !== "";
  }
};
