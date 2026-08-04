import type { TaskPriorityValue } from "@dashboard/shared";

export const PRIORITY_CONFIG: Record<
  TaskPriorityValue,
  { label: string; className: string; dotClassName: string; pillClassName: string }
> = {
  URGENT: {
    label: "Urgent",
    className: "text-red-900",
    dotClassName: "bg-red-900",
    pillClassName: "border-red-100 bg-red-50 text-red-900",
  },
  HIGH: {
    label: "High",
    className: "text-red-500",
    dotClassName: "bg-red-500",
    pillClassName: "border-red-100 bg-red-50 text-red-700",
  },
  NORMAL: {
    label: "Normal",
    className: "text-orange-500",
    dotClassName: "bg-orange-500",
    pillClassName: "border-orange-100 bg-orange-50 text-orange-700",
  },
  LOW: {
    label: "Low",
    className: "text-yellow-500",
    dotClassName: "bg-yellow-400",
    pillClassName: "border-yellow-100 bg-yellow-50 text-yellow-700",
  },
};
