import type { TaskListDto, TaskListItemDto } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@dashboard/ui/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { TaskRow } from "./task-row";

const COLUMN_COUNT = 8;
const REVEAL_STEP = 20;

type TaskListSectionProps = {
  list: TaskListDto;
  tasks: TaskListItemDto[];
  draggable: boolean;
  showHeader: boolean;
  onToggleComplete: (task: TaskListItemDto) => void;
  onOpenTask: (task: TaskListItemDto) => void;
};

export const TaskListSection = ({
  list,
  tasks,
  draggable,
  showHeader,
  onToggleComplete,
  onOpenTask,
}: TaskListSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  const [collapsed, setCollapsed] = useState(false);
  const [revealed, setRevealed] = useState(REVEAL_STEP);
  const [sentinel, setSentinel] = useState<HTMLTableRowElement | null>(null);

  const visibleTasks = tasks.slice(0, revealed);
  const hasMore = tasks.length > visibleTasks.length;

  // Reveals the next slice once the sentinel row scrolls into view.
  useEffect(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRevealed((count) => count + REVEAL_STEP);
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel]);

  return (
    <tbody
      ref={setNodeRef}
      className={cn(isOver && "outline outline-2 -outline-offset-2 outline-primary/40")}
    >
      {showHeader && (
        <tr className="border-b border-border bg-muted/80">
          <td colSpan={COLUMN_COUNT} className="px-3 py-2">
            <button
              type="button"
              className="flex items-center gap-2"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {list.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {tasks.length}
              </Badge>
            </button>
          </td>
        </tr>
      )}

      {!collapsed && (
        <SortableContext
          items={visibleTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <tr className="border-b border-border">
              <td
                colSpan={COLUMN_COUNT}
                className="px-4 py-6 text-center text-sm text-muted-foreground"
              >
                No tasks in this list
              </td>
            </tr>
          ) : (
            visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                draggable={draggable}
                onToggleComplete={onToggleComplete}
                onOpen={onOpenTask}
              />
            ))
          )}
        </SortableContext>
      )}

      {!collapsed && hasMore && (
        <tr ref={setSentinel} className="border-b border-border">
          <td
            colSpan={COLUMN_COUNT}
            className="px-4 py-4 text-center text-sm text-muted-foreground"
          >
            Loading more tasks...
          </td>
        </tr>
      )}
    </tbody>
  );
};
