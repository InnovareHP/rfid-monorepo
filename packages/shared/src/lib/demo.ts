// Public product demo requests. Prospect data, never PHI.

export const DEMO_REQUEST_STATUSES = [
  "NEW",
  "SCHEDULED",
  "COMPLETED",
  "NO_SHOW",
  "DISQUALIFIED",
  "CANCELED",
] as const;

export type DemoRequestStatus = (typeof DEMO_REQUEST_STATUSES)[number];

export const DEMO_REQUEST_STATUS_LABELS: Record<DemoRequestStatus, string> = {
  NEW: "New",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
  DISQUALIFIED: "Disqualified",
  CANCELED: "Canceled",
};

// Only an admin sets these; NEW and SCHEDULED are written by the booking flow.
export const DEMO_OUTCOME_STATUSES = [
  "COMPLETED",
  "NO_SHOW",
  "DISQUALIFIED",
  "CANCELED",
] as const satisfies readonly DemoRequestStatus[];

export const TEAM_SIZE_OPTIONS = [
  "1-5",
  "6-20",
  "21-50",
  "51-200",
  "200+",
] as const;

export type TeamSize = (typeof TEAM_SIZE_OPTIONS)[number];
