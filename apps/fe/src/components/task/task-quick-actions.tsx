import { useRunningTimer, useTaskMutations } from "@/hooks/use-tasks";
import {
  TASK_PRIORITY,
  type TaskListItemDto,
  type TaskPriorityValue,
} from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { cn } from "@dashboard/ui/lib/utils";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Flag,
  MoreHorizontal,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "../confirmation-dialog";
import { PRIORITY_CONFIG } from "./task-priority";

type TaskQuickActionsProps = {
  task: TaskListItemDto;
};

export const TaskQuickActions = ({ task }: TaskQuickActionsProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const runningTimer = useRunningTimer().data;
  const {
    updateTaskMutation,
    deleteTaskMutation,
    duplicateTaskMutation,
    startTimerMutation,
    stopTimerMutation,
  } = useTaskMutations();

  if (task.id.startsWith("temp-")) return null;

  const isTimerRunning = runningTimer?.taskId === task.id;

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      stopTimerMutation.mutate();
    } else {
      startTimerMutation.mutate(task);
    }
  };

  return (
    <div
      className="flex items-center gap-0.5 shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0",
          isTimerRunning
            ? "text-red-600 hover:text-red-700"
            : "text-gray-400 hover:text-gray-600"
        )}
        onClick={handleToggleTimer}
        aria-label={isTimerRunning ? "Stop timer" : "Start timer"}
        title={isTimerRunning ? "Stop timer" : "Start timer"}
      >
        {isTimerRunning ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
            aria-label="Task actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Flag
                className={cn(
                  "h-3.5 w-3.5 mr-2",
                  PRIORITY_CONFIG[task.priority].className
                )}
              />
              Priority
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {Object.values(TASK_PRIORITY).map((priority) => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() =>
                    updateTaskMutation.mutate({
                      id: task.id,
                      data: { priority: priority as TaskPriorityValue },
                    })
                  }
                >
                  <Flag
                    className={cn(
                      "h-3.5 w-3.5 mr-2",
                      PRIORITY_CONFIG[priority as TaskPriorityValue].className
                    )}
                  />
                  {PRIORITY_CONFIG[priority as TaskPriorityValue].label}
                  {task.priority === priority && (
                    <Check className="h-3.5 w-3.5 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onClick={() => duplicateTaskMutation.mutate(task.id)}
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            Duplicate
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              updateTaskMutation.mutate({
                id: task.id,
                data: { isArchived: !task.isArchived },
              })
            }
          >
            {task.isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5 mr-2" />
            ) : (
              <Archive className="h-3.5 w-3.5 mr-2" />
            )}
            {task.isArchived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete task?"
        description={`"${task.name}" and all its subtasks, comments, and attachments will be removed. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          deleteTaskMutation.mutate(task.id);
          setConfirmDelete(false);
        }}
      />
    </div>
  );
};
