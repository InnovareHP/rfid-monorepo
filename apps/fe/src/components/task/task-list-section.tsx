import type { TaskListDto, TaskListItemDto } from "@dashboard/shared";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@dashboard/ui/components/badge";
import { cn } from "@dashboard/ui/lib/utils";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { useState } from "react";
import { TaskRow } from "./task-row";

type SortableTaskRowProps = {
  task: TaskListItemDto;
  onToggleComplete: (task: TaskListItemDto) => void;
  onOpen: (task: TaskListItemDto) => void;
};

const SortableTaskRow = ({
  task,
  onToggleComplete,
  onOpen,
}: SortableTaskRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-stretch"
    >
      <button
        type="button"
        className="flex items-center px-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing border-b border-gray-100 bg-white"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <TaskRow task={task} onToggleComplete={onToggleComplete} onOpen={onOpen} />
      </div>
    </div>
  );
};

type TaskListSectionProps = {
  list: TaskListDto;
  tasks: TaskListItemDto[];
  onToggleComplete: (task: TaskListItemDto) => void;
  onOpenTask: (task: TaskListItemDto) => void;
};

export const TaskListSection = ({
  list,
  tasks,
  onToggleComplete,
  onOpenTask,
}: TaskListSectionProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-gray-200 overflow-hidden bg-white",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-left hover:bg-gray-100 transition-colors",
          !collapsed && "border-b border-gray-200"
        )}
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand ${list.name}` : `Collapse ${list.name}`}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <h3 className="text-sm font-semibold text-gray-900">{list.name}</h3>
        <Badge variant="outline" className="text-xs">
          {tasks.length}
        </Badge>
      </button>
      {!collapsed && (
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">
              No tasks in this list
            </p>
          ) : (
            tasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onOpen={onOpenTask}
              />
            ))
          )}
        </SortableContext>
      )}
    </div>
  );
};
