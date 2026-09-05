import { format } from "date-fns";

// toISOString converts to UTC first, so a date picked after 4pm in a UTC+8 zone
// serialized as the previous day. These format the calendar date the user sees.
export const toLocalDateValue = (date: Date) => format(date, "yyyy-MM-dd");

export const toLocalDateTimeValue = (date: Date) =>
  format(date, "yyyy-MM-dd'T'HH:mm");
