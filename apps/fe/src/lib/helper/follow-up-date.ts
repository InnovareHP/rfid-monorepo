const DAY_MS = 86_400_000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayOffset = (iso: string) =>
  Math.round(
    (startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()) /
      DAY_MS
  );

export type FollowUpBucket = "overdue" | "today" | "week";

export const followUpBucket = (iso: string): FollowUpBucket => {
  const days = dayOffset(iso);
  if (days < 0) return "overdue";
  return days === 0 ? "today" : "week";
};

// The queue only ever looks a week out, and the browser knows where the local
// day ends, so the window is computed here rather than in the API.
export const followUpWindowEnd = () =>
  new Date(startOfDay(new Date()).getTime() + DAY_MS * 8).toISOString();

// Inside a week a weekday reads the way a liaison says it: "follow up Thursday".
export const formatFollowUpDate = (iso: string | null) => {
  if (!iso) return null;

  const days = dayOffset(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";

  const date = new Date(iso);

  return Math.abs(days) <= 6
    ? date.toLocaleDateString(undefined, { weekday: "long" })
    : date.toLocaleDateString();
};
