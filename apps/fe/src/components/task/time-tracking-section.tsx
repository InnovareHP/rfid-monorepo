import { formatMinutes } from "@/lib/helper/helper";
import type { RunningTimer } from "@/services/task/task-service";
import type { TaskDto, TaskTimeEntryDto } from "@dashboard/shared";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type TimeTrackingSectionProps = {
  task: TaskDto;
  entries: TaskTimeEntryDto[];
  runningTimer: RunningTimer | undefined;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onAddManual: (durationMinutes: number, note?: string) => void;
  onDeleteEntry: (entryId: string) => void;
  disabled?: boolean;
};

export const TimeTrackingSection = ({
  task,
  entries,
  runningTimer,
  onStartTimer,
  onStopTimer,
  onAddManual,
  onDeleteEntry,
  disabled,
}: TimeTrackingSectionProps) => {
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");

  const isRunningHere = runningTimer?.taskId === task.id;
  const isRunningElsewhere = Boolean(runningTimer) && !isRunningHere;

  const handleAddManual = () => {
    const parsed = Number(minutes);
    if (!parsed || parsed <= 0) return;
    onAddManual(parsed, note.trim() || undefined);
    setMinutes("");
    setNote("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Time Tracking</h4>
        <span className="text-xs text-gray-500">
          {formatMinutes(task.trackedMinutes)} tracked
          {task.estimatedMinutes
            ? ` of ${formatMinutes(task.estimatedMinutes)} estimated`
            : ""}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isRunningHere ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStopTimer}
            disabled={disabled}
          >
            <Pause className="h-4 w-4 mr-1" />
            Stop Timer
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onStartTimer}
            disabled={disabled || isRunningElsewhere}
          >
            <Play className="h-4 w-4 mr-1" />
            Start Timer
          </Button>
        )}
        {isRunningHere && runningTimer && (
          <span className="text-xs text-green-600">
            Running since {formatDateTime(runningTimer.startedAt)}
          </span>
        )}
        {isRunningElsewhere && runningTimer && (
          <span className="text-xs text-amber-600">
            Timer running on #{runningTimer.taskNumber}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          placeholder="Minutes"
          className="h-8 w-24"
        />
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note (optional)"
          className="h-8 flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddManual}
          disabled={disabled || !minutes}
        >
          <Plus className="h-4 w-4 mr-1" />
          Log
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-gray-50 text-sm"
            >
              <span className="font-medium text-gray-900 w-16 shrink-0">
                {entry.durationMinutes
                  ? formatMinutes(entry.durationMinutes)
                  : "Running"}
              </span>
              <span className="text-gray-500 text-xs flex-1 truncate">
                {entry.userName ?? ""}
                {entry.note ? ` — ${entry.note}` : ""}
              </span>
              <span className="text-xs text-gray-400">
                {formatDateTime(entry.startedAt)}
              </span>
              {entry.endedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteEntry(entry.id)}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                  aria-label="Delete time entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
