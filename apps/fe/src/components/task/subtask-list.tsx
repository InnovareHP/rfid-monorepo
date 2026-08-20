import type { TaskListItemDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import { cn } from "@dashboard/ui/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TaskSection } from "./task-section";

type SubtaskListProps = {
  subtasks: TaskListItemDto[];
  onAdd: (name: string) => void;
  onToggleComplete: (subtask: TaskListItemDto) => void;
  onOpen: (subtask: TaskListItemDto) => void;
  disabled?: boolean;
};

export const SubtaskList = ({
  subtasks,
  onAdd,
  onToggleComplete,
  onOpen,
  disabled,
}: SubtaskListProps) => {
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
  };

  return (
    <TaskSection title="Subtasks">
      {subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex cursor-pointer items-center gap-3 rounded px-1 py-1 hover:bg-muted"
              onClick={() => onOpen(subtask)}
            >
              <div onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  checked={Boolean(subtask.completedAt)}
                  disabled={disabled}
                  onCheckedChange={() => onToggleComplete(subtask)}
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                #{subtask.taskNumber}
              </span>
              <span
                className={cn(
                  "flex-1 truncate text-sm text-foreground",
                  subtask.completedAt && "text-muted-foreground line-through"
                )}
              >
                {subtask.name}
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: subtask.status.color }}
              >
                {subtask.status.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Checkbox checked={false} disabled aria-hidden />
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add Subtask"
          className="flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAdd}
          disabled={disabled || !name.trim()}
          aria-label="Add subtask"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </TaskSection>
  );
};
