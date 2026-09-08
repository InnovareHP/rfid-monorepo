import type { TaskSort, TaskSortKey } from "@/lib/helper/task-insights";
import type { TaskListDto, TaskListItemDto } from "@dashboard/shared";
import { cn } from "@dashboard/ui/lib/utils";
import { ArrowDownAZ, ArrowUpAZ, ChevronsUpDown } from "lucide-react";
import { TaskListSection } from "./task-list-section";

const COLUMNS: { key: TaskSortKey; label: string }[] = [
  { key: "name", label: "Task" },
  { key: "assignee", label: "Assignee" },
  { key: "dueDate", label: "Due Date" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
];

type TaskTableProps = {
  lists: TaskListDto[];
  tasksByList: Map<string, TaskListItemDto[]>;
  sort: TaskSort | null;
  onSortChange: (sort: TaskSort | null) => void;
  totalCount: number;
  completedCount: number;
  onToggleComplete: (task: TaskListItemDto) => void;
  onOpenTask: (task: TaskListItemDto) => void;
};

const SortHeader = ({
  column,
  sort,
  onSortChange,
}: {
  column: { key: TaskSortKey; label: string };
  sort: TaskSort | null;
  onSortChange: (sort: TaskSort | null) => void;
}) => {
  const isActive = sort?.key === column.key;

  // Cycles ascending, descending, then back to manual order.
  const handleClick = () => {
    if (!isActive) return onSortChange({ key: column.key, order: "asc" });
    if (sort?.order === "asc")
      return onSortChange({ key: column.key, order: "desc" });
    onSortChange(null);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 font-semibold text-brand transition-colors hover:text-primary"
    >
      {column.label}
      {isActive && sort?.order === "asc" && (
        <ArrowUpAZ className="h-3.5 w-3.5 text-primary" />
      )}
      {isActive && sort?.order === "desc" && (
        <ArrowDownAZ className="h-3.5 w-3.5 text-primary" />
      )}
      {!isActive && <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />}
    </button>
  );
};

export const TaskTable = ({
  lists,
  tasksByList,
  sort,
  onSortChange,
  totalCount,
  completedCount,
  onToggleComplete,
  onOpenTask,
}: TaskTableProps) => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-brand/5">
            <th className="w-8 px-2 py-3" />
            <th className="w-10 px-2 py-3" />
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-3 py-3 text-sm whitespace-nowrap",
                  column.key === "name" && "min-w-64"
                )}
              >
                <SortHeader
                  column={column}
                  sort={sort}
                  onSortChange={onSortChange}
                />
              </th>
            ))}
            <th className="w-20 px-3 py-3" />
          </tr>
        </thead>

        {lists.map((list) => (
          <TaskListSection
            key={list.id}
            list={list}
            tasks={tasksByList.get(list.id) ?? []}
            draggable={!sort}
            showHeader={lists.length > 1}
            onToggleComplete={onToggleComplete}
            onOpenTask={onOpenTask}
          />
        ))}
      </table>
    </div>

    <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
      {completedCount} of {totalCount} task(s) completed.
    </div>
  </div>
);
