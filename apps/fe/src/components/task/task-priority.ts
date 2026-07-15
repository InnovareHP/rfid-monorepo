import type { TaskPriorityValue } from "@dashboard/shared";

export const PRIORITY_CONFIG: Record<
  TaskPriorityValue,
  { label: string; className: string }
> = {
  URGENT: { label: "Urgent", className: "text-red-600" },
  HIGH: { label: "High", className: "text-orange-500" },
  NORMAL: { label: "Normal", className: "text-blue-500" },
  LOW: { label: "Low", className: "text-gray-400" },
};
