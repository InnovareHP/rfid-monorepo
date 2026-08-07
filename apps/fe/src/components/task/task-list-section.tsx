import type { TaskListDto, TaskListItemDto } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@dashboard/ui/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TaskRow } from "./task-row";

const COLUMN_COUNT = 8;

type TaskListSectionProps = {
  list: TaskListDto;
  tasks: TaskListItemDto[];
  totalCount: number;
  draggable: boolean;
  showHeader: boolean;
  onToggleComplete: (task: TaskListItemDto) => void;
  onOpenTask: (task: TaskListItemDto) => void;
};

export const TaskListSection = ({
  list,
  tasks,
  totalCount,
  draggable,
  showHeader,
  onToggleComplete,
  onOpenTask,
}: TaskListSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  const [collapsed, setCollapsed] = useState(false);

  return (
    <tbody
      ref={setNodeRef}
      className={cn(isOver && "outline outline-2 -outline-offset-2 outline-primary/40")}
    >
      {showHeader && (
        <tr className="border-b border-gray-200 bg-gray-50/80">
          <td colSpan={COLUMN_COUNT} className="px-3 py-2">
            <button
              type="button"
              className="flex items-center gap-2"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm font-semibold text-gray-900">
                {list.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {totalCount}
              </Badge>
            </button>
          </td>
        </tr>
      )}

      {!collapsed && (
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <tr className="border-b border-gray-100">
              <td
                colSpan={COLUMN_COUNT}
                className="px-4 py-6 text-center text-sm text-gray-400"
              >
                No tasks in this list
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
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
    </tbody>
  );
};
