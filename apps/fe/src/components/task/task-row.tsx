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
import { format } from "date-fns";
import {
  CalendarDays,
  CheckSquare,
  Flag,
  GitBranch,
  Lock,
  Timer,
} from "lucide-react";
import { PRIORITY_CONFIG } from "./task-priority";
import { TaskQuickActions } from "./task-quick-actions";

type TaskRowProps = {
  task: TaskListItemDto;
  onToggleComplete: (task: TaskListItemDto) => void;
  onOpen: (task: TaskListItemDto) => void;
};

export const TaskRow = ({ task, onToggleComplete, onOpen }: TaskRowProps) => {
  const isCompleted = Boolean(task.completedAt);
  const isOverdue =
    !isCompleted && task.dueDate && new Date(task.dueDate) < new Date();
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group/task",
        task.isArchived && "opacity-60"
      )}
      onClick={() => onOpen(task)}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete(task)}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        />
      </div>

      <span className="text-xs font-mono text-gray-400 shrink-0">
        #{task.taskNumber}
      </span>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className={cn(
            "text-sm font-medium text-gray-900 truncate",
            isCompleted && "line-through text-gray-400"
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

      <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
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
          <span className="flex items-center gap-1" title="Tracked / estimated">
            <Timer className="h-3.5 w-3.5" />
            {formatMinutes(task.trackedMinutes)}
            {task.estimatedMinutes
              ? ` / ${formatMinutes(task.estimatedMinutes)}`
              : ""}
          </span>
        )}

        {task.dueDate && (
          <span
            className={cn(
              "flex items-center gap-1",
              isOverdue && "text-red-600 font-medium"
            )}
            title="Due date"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}

        <Flag
          className={cn("h-3.5 w-3.5", priority.className)}
          aria-label={priority.label}
        />

        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: task.status.color }}
        >
          {task.status.name}
        </span>

        {task.assignees.length > 0 && (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar
                key={assignee.memberId}
                className="h-6 w-6 border-2 border-white"
              >
                <AvatarImage src={assignee.image ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {assignee.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignees.length > 3 && (
              <span className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-600">
                +{task.assignees.length - 3}
              </span>
            )}
          </div>
        )}

        <TaskQuickActions task={task} />
      </div>
    </div>
  );
};
