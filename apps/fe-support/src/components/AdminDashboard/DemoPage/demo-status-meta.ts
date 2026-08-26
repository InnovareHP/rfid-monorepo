import {
  DEMO_OUTCOME_STATUSES,
  DEMO_REQUEST_STATUSES,
  DEMO_REQUEST_STATUS_LABELS,
  type DemoRequestStatus,
} from "@dashboard/shared";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// NEW is the one that needs acting on, so it is the only one that reads loud.
export const STATUS_VARIANT: Record<DemoRequestStatus, BadgeVariant> = {
  NEW: "default",
  SCHEDULED: "secondary",
  COMPLETED: "outline",
  NO_SHOW: "destructive",
  DISQUALIFIED: "destructive",
  CANCELED: "outline",
};

export const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  ...DEMO_REQUEST_STATUSES.map((status) => ({
    value: status,
    label: DEMO_REQUEST_STATUS_LABELS[status],
  })),
];

export const OUTCOME_OPTIONS = DEMO_OUTCOME_STATUSES.map((status) => ({
  value: status,
  label: DEMO_REQUEST_STATUS_LABELS[status],
}));
