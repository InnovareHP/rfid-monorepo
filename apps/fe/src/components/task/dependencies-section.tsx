import type { TaskDto, TaskListItemDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Lock, Plus, X } from "lucide-react";
import { useState } from "react";

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
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900">Dependencies</h4>

      {task.blockedBy.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Blocked by
          </p>
          {task.blockedBy.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center gap-2 py-1 px-2 rounded bg-amber-50 border border-amber-200 text-sm"
            >
              <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="flex-1 truncate text-gray-800">
                #{dep.blockerTaskNumber} {dep.blockerTaskName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(dep.id)}
                disabled={disabled}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                aria-label="Remove dependency"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {task.blocking.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Blocking
          </p>
          {task.blocking.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center gap-2 py-1 px-2 rounded bg-gray-50 border border-gray-200 text-sm"
            >
              <span className="flex-1 truncate text-gray-800">
                #{dep.blockedTaskNumber} {dep.blockedTaskName}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select value={selectedBlocker} onValueChange={setSelectedBlocker}>
          <SelectTrigger className="h-8 flex-1">
            <SelectValue placeholder="Add blocked-by task..." />
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
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !selectedBlocker}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
