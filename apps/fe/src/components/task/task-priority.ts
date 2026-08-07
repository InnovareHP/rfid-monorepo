import type { TaskPriorityValue } from "@dashboard/shared";

export const PRIORITY_CONFIG: Record<
  TaskPriorityValue,
  { label: string; className: string; dotClassName: string; pillClassName: string }
> = {
  URGENT: {
    label: "Urgent",
    className: "text-destructive",
    dotClassName: "bg-destructive",
    pillClassName: "border-destructive/40 bg-destructive/20 text-destructive",
  },
  HIGH: {
    label: "High",
    className: "text-destructive",
    dotClassName: "bg-destructive/60",
    pillClassName: "border-destructive/20 bg-destructive/5 text-destructive",
  },
  NORMAL: {
    label: "Normal",
    className: "text-warning",
    dotClassName: "bg-warning",
    pillClassName: "border-warning/30 bg-warning/10 text-warning",
  },
  LOW: {
    label: "Low",
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground/60",
    pillClassName: "border-border bg-muted text-muted-foreground",
  },
};
