import type { TaskDto, TaskListItemDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Lock, Plus, X } from "lucide-react";
import { useState } from "react";
import { TaskSection } from "./task-section";

type DependenciesSectionProps = {
  task: TaskDto;
  candidateTasks: TaskListItemDto[];
  onAdd: (blockerTaskId: string) => void;
  onRemove: (dependencyId: string) => void;
  disabled?: boolean;
};

export const DependenciesSection = ({
  task,
  candidateTasks,
  onAdd,
  onRemove,
  disabled,
}: DependenciesSectionProps) => {
  const [selectedBlocker, setSelectedBlocker] = useState("");

  const excludedIds = new Set([
    task.id,
    ...task.blockedBy.map((dep) => dep.blockerTaskId),
  ]);
  const candidates = candidateTasks.filter(
    (candidate) => !excludedIds.has(candidate.id)
  );

  const handleAdd = () => {
    if (!selectedBlocker) return;
    onAdd(selectedBlocker);
    setSelectedBlocker("");
  };

  return (
    <TaskSection title="Dependencies">
      {task.blockedBy.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Blocked by</p>
          {task.blockedBy.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-sm"
            >
              <Lock className="size-3.5 shrink-0 text-warning" />
              <span className="flex-1 truncate text-foreground">
                #{dep.blockerTaskNumber} {dep.blockerTaskName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(dep.id)}
                disabled={disabled}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove dependency"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {task.blocking.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Blocking</p>
          {task.blocking.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center gap-2 rounded border bg-muted px-2 py-1 text-sm"
            >
              <span className="flex-1 truncate text-foreground">
                #{dep.blockedTaskNumber} {dep.blockedTaskName}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Checkbox checked={false} disabled aria-hidden />
        <Select value={selectedBlocker} onValueChange={setSelectedBlocker}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Add Blocked-By Task" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id}>
                #{candidate.taskNumber} {candidate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAdd}
          disabled={disabled || !selectedBlocker}
          aria-label="Add dependency"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </TaskSection>
  );
};
