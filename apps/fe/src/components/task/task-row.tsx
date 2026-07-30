import { formatMinutes } from "@/lib/helper/helper";
import type { TaskListItemDto } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { cn } from "@dashboard/ui/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { CheckSquare, GitBranch, GripVertical, Lock, Timer } from "lucide-react";
import { PRIORITY_CONFIG } from "./task-priority";
import { TaskQuickActions } from "./task-quick-actions";

type TaskRowProps = {
  task: TaskListItemDto;
  draggable: boolean;
  onToggleComplete: (task: TaskListItemDto) => void;
  onOpen: (task: TaskListItemDto) => void;
};

export const TaskRow = ({
  task,
  draggable,
  onToggleComplete,
  onOpen,
}: TaskRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !draggable });

  const isCompleted = Boolean(task.completedAt);
  const isOverdue =
    !isCompleted && task.dueDate && new Date(task.dueDate) < new Date();
  const priority = PRIORITY_CONFIG[task.priority];
  const assignee = task.assignees[0];

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        "border-b border-gray-100 bg-white transition-colors hover:bg-gray-50",
        task.isArchived && "opacity-60"
      )}
      onClick={() => onOpen(task)}
    >
      <td className="w-8 px-2 py-2.5">
        {draggable && (
          <button
            type="button"
            className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            aria-label="Drag to reorder"
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>

      <td className="w-10 px-2 py-2.5" onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete(task)}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        />
      </td>

      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium text-gray-900",
              isCompleted && "text-gray-400 line-through"
            )}
          >
            {task.name}
          </span>
          {task.labels.map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              className="shrink-0 text-xs"
              style={{ borderColor: label.color, color: label.color }}
            >
              {label.name}
            </Badge>
          ))}
          {task.isArchived && (
            <Badge variant="outline" className="shrink-0 text-xs text-gray-500">
              Archived
            </Badge>
          )}
        </div>

        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 empty:mt-0">
          {task.blockedByCount > 0 && (
            <span
              className="flex items-center gap-1 text-amber-600"
              title="Blocked by other tasks"
            >
              <Lock className="h-3.5 w-3.5" />
              {task.blockedByCount}
            </span>
          )}

          {task.subtaskCount > 0 && (
            <span className="flex items-center gap-1" title="Subtasks">
              <GitBranch className="h-3.5 w-3.5" />
              {task.subtaskCount}
            </span>
          )}

          {task.checklistTotal > 0 && (
            <span className="flex items-center gap-1" title="Checklist">
              <CheckSquare className="h-3.5 w-3.5" />
              {task.checklistDone}/{task.checklistTotal}
            </span>
          )}

          {(task.trackedMinutes > 0 || task.estimatedMinutes) && (
            <span
              className="flex items-center gap-1"
              title="Tracked / estimated"
            >
              <Timer className="h-3.5 w-3.5" />
              {formatMinutes(task.trackedMinutes)}
              {task.estimatedMinutes
                ? ` / ${formatMinutes(task.estimatedMinutes)}`
                : ""}
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-2.5 text-sm text-gray-600">
        {assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.image ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {assignee.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{assignee.name}</span>
            {task.assignees.length > 1 && (
              <span className="text-xs text-gray-400">
                +{task.assignees.length - 1}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )}
      </td>

      <td
        className={cn(
          "px-3 py-2.5 text-sm whitespace-nowrap text-gray-600",
          isOverdue && "font-medium text-red-600"
        )}
      >
        {task.dueDate ? format(new Date(task.dueDate), "MMMM d, yyyy") : "-"}
      </td>

      <td className="px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            priority.pillClassName
          )}
        >
          <span className={cn("size-2 rounded-full", priority.dotClassName)} />
          {priority.label}
        </span>
      </td>

      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: task.status.color }}
          />
          {task.status.name}
        </span>
      </td>

      <td className="w-20 px-3 py-2.5">
        <div className="flex justify-end">
          <TaskQuickActions task={task} />
        </div>
      </td>
    </tr>
  );
};
