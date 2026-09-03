import { endOfDay, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

// The log endpoints only narrow when both ends are present, and they compare
// against a timestamp, so the closing day is taken whole.
export const logDateFilter = (
  range: DateRange | undefined,
  fromKey: string,
  toKey: string
) =>
  range?.from && range?.to
    ? {
        [fromKey]: startOfDay(range.from).toISOString(),
        [toKey]: endOfDay(range.to).toISOString(),
      }
    : undefined;
