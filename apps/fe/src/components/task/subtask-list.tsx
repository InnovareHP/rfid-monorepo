import type { TaskListItemDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import { cn } from "@dashboard/ui/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";

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
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900">Subtasks</h4>

      {subtasks.length === 0 ? (
        <p className="text-sm text-gray-400">No subtasks</p>
      ) : (
        <div className="space-y-1">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer"
              onClick={() => onOpen(subtask)}
            >
              <div onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  checked={Boolean(subtask.completedAt)}
                  disabled={disabled}
                  onCheckedChange={() => onToggleComplete(subtask)}
                />
              </div>
              <span className="text-xs font-mono text-gray-400">
                #{subtask.taskNumber}
              </span>
              <span
                className={cn(
                  "flex-1 text-sm text-gray-800 truncate",
                  subtask.completedAt && "line-through text-gray-400"
                )}
              >
                {subtask.name}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white shrink-0"
                style={{ backgroundColor: subtask.status.color }}
              >
                {subtask.status.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add subtask"
          className="h-8"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !name.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
