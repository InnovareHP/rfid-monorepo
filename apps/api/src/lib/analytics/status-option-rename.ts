// A saved chart stores the status option as a literal name, not an id, so
// renaming an option leaves every chart filtering on the old name matching
// nothing. Used by the referral field migration.

export type ChartFilter = {
  match?: string;
  conditions?: { fieldId?: string; operator?: string; value?: string }[];
};

// Returns the rewritten filter, or null when this filter does not mention the
// option so the caller can skip the write.
export const renameOptionInFilter = (
  filter: unknown,
  fieldId: string,
  from: string,
  to: string
): ChartFilter | null => {
  const parsed = filter as ChartFilter | null;
  if (!parsed?.conditions?.length) return null;

  let changed = false;
  const conditions = parsed.conditions.map((condition) => {
    if (condition.fieldId !== fieldId || !condition.value) return condition;

    const entries = condition.value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => (entry === from ? to : entry));

    // An "in" list naming both the old and the new name collapses to one.
    const value = entries
      .filter((entry, index) => entries.indexOf(entry) === index)
      .join(",");

    if (value === condition.value) return condition;
    changed = true;
    return { ...condition, value };
  });

  return changed ? { ...parsed, conditions } : null;
};
