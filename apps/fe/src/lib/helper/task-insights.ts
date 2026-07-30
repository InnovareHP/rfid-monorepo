import { sequentialRampColor } from "@/lib/color-utils";
import {
  TASK_STATUS_CATEGORY,
  type TaskListItemDto,
  type TaskStatusDto,
} from "@dashboard/shared";
import type { StatusSlice } from "./analytics-chart-data";

export type TaskStats = {
  total: number;
  mine: number;
  completionRate: number;
  overdue: number;
  dueThisWeek: number;
  unassigned: number;
  blocked: number;
};

export type TaskInsight = {
  title: string;
  detail: string;
};

export type TaskSortKey =
  | "name"
  | "assignee"
  | "dueDate"
  | "priority"
  | "status";

export type TaskSort = {
  key: TaskSortKey;
  order: "asc" | "desc";
};

const PRIORITY_WEIGHT: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

const isOpen = (task: TaskListItemDto) =>
  !task.completedAt && task.status.category === TASK_STATUS_CATEGORY.ACTIVE;

export function buildTaskStats(
  tasks: TaskListItemDto[],
  memberId?: string
): TaskStats {
  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;

  return {
    total: tasks.length,
    mine: memberId
      ? tasks.filter((task) =>
          task.assignees.some((assignee) => assignee.memberId === memberId)
        ).length
      : 0,
    completionRate: tasks.length
      ? Math.round((completed / tasks.length) * 100)
      : 0,
    overdue: tasks.filter(
      (task) => isOpen(task) && task.dueDate && new Date(task.dueDate).getTime() < now
    ).length,
    dueThisWeek: tasks.filter((task) => {
      if (!isOpen(task) || !task.dueDate) return false;
      const due = new Date(task.dueDate).getTime();
      return due >= now && due <= weekAhead;
    }).length,
    unassigned: tasks.filter(
      (task) => isOpen(task) && task.assignees.length === 0
    ).length,
    blocked: tasks.filter((task) => isOpen(task) && task.blockedByCount > 0)
      .length,
  };
}

export function buildTaskInsights(stats: TaskStats): TaskInsight[] {
  return [
    {
      title: stats.overdue
        ? `You have ${stats.overdue} task${stats.overdue === 1 ? "" : "s"} overdue.`
        : "No tasks are overdue.",
      detail: stats.overdue
        ? "Review and prioritize to stay on track."
        : "Everything with a due date is still on schedule.",
    },
    {
      title: `${stats.dueThisWeek} task${stats.dueThisWeek === 1 ? " is" : "s are"} due this week.`,
      detail: "Plan your timeline to complete them.",
    },
    {
      title: `The team has completed ${stats.completionRate}% of these tasks.`,
      detail: "Close out the oldest open items first to keep momentum.",
    },
    {
      title: stats.unassigned
        ? `${stats.unassigned} open task${stats.unassigned === 1 ? "" : "s"} have no assignee.`
        : "Every open task has an assignee.",
      detail: "Assigned work is far more likely to get finished.",
    },
    {
      title: stats.blocked
        ? `${stats.blocked} open task${stats.blocked === 1 ? " is" : "s are"} blocked.`
        : "Nothing is blocked right now.",
      detail: "Clear blockers early so dependent work can start.",
    },
  ];
}

export function buildTaskStatusSlices(
  tasks: TaskListItemDto[],
  statuses: TaskStatusDto[]
): StatusSlice[] {
  const total = tasks.length;
  if (total === 0) return [];

  const counts = new Map<string, number>();
  for (const task of tasks) {
    counts.set(task.statusId, (counts.get(task.statusId) ?? 0) + 1);
  }

  // Only statuses in use get a slice, so the ramp spreads across visible data.
  const used = statuses.filter((status) => (counts.get(status.id) ?? 0) > 0);

  // Same sequential blue ramp the referral analytics donut uses, darkest for the largest slice.
  const rankById = new Map(
    [...used]
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
      .map((status, index) => [status.id, index])
  );

  return used.map((status) => {
    const count = counts.get(status.id) ?? 0;
    return {
      status: status.name,
      count,
      color: sequentialRampColor(rankById.get(status.id) ?? 0, used.length),
      share: (count / total) * 100,
    };
  });
}

function compareTasks(
  a: TaskListItemDto,
  b: TaskListItemDto,
  key: TaskSortKey
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "assignee":
      return (a.assignees[0]?.name ?? "").localeCompare(
        b.assignees[0]?.name ?? ""
      );
    case "dueDate":
      // Tasks without a due date sort last.
      return (
        (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
        (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)
      );
    case "priority":
      return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    case "status":
      return a.status.sortOrder - b.status.sortOrder;
  }
}

export function sortTasks(
  tasks: TaskListItemDto[],
  sort: TaskSort | null
): TaskListItemDto[] {
  if (!sort) return [...tasks].sort((a, b) => a.position - b.position);
  const factor = sort.order === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => compareTasks(a, b, sort.key) * factor);
}
