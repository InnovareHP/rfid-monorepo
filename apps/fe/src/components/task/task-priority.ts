import type { TaskPriorityValue } from "@dashboard/shared";

export const PRIORITY_CONFIG: Record<
  TaskPriorityValue,
  { label: string; className: string; dotClassName: string; pillClassName: string }
> = {
  URGENT: {
    label: "Urgent",
    className: "text-red-600",
    dotClassName: "bg-red-500",
    pillClassName: "border-red-100 bg-red-50 text-red-700",
  },
  HIGH: {
    label: "High",
    className: "text-orange-500",
    dotClassName: "bg-orange-500",
    pillClassName: "border-orange-100 bg-orange-50 text-orange-700",
  },
  NORMAL: {
    label: "Normal",
    className: "text-blue-500",
    dotClassName: "bg-amber-500",
    pillClassName: "border-amber-100 bg-amber-50 text-amber-700",
  },
  LOW: {
    label: "Low",
    className: "text-gray-400",
    dotClassName: "bg-yellow-400",
    pillClassName: "border-yellow-100 bg-yellow-50 text-yellow-700",
  },
};
