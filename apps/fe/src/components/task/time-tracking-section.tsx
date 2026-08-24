import { formatMinutes } from "@/lib/helper/helper";
import type { RunningTimer } from "@/services/task/task-service";
import type { TaskDto, TaskTimeEntryDto } from "@dashboard/shared";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { TaskSection } from "./task-section";

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
    <TaskSection title="Time Tracking">
      <div className="flex flex-wrap items-center gap-3">
        {isRunningHere ? (
          <Button variant="destructive" onClick={onStopTimer} disabled={disabled}>
            <Pause className="size-4" />
            Stop Timer
          </Button>
        ) : (
          <Button
            onClick={onStartTimer}
            disabled={disabled || isRunningElsewhere}
          >
            <Play className="size-4" />
            Start Timer
          </Button>
        )}
        {isRunningHere && runningTimer && (
          <span className="text-xs text-success">
            Running since {formatDateTime(runningTimer.startedAt)}
          </span>
        )}
        {isRunningElsewhere && runningTimer && (
          <span className="text-xs text-warning">
            Timer running on #{runningTimer.taskNumber}
          </span>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {formatMinutes(task.trackedMinutes)} tracked
          {task.estimatedMinutes
            ? ` of ${formatMinutes(task.estimatedMinutes)} estimated`
            : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="number"
          min={1}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          placeholder="Minutes"
          className="w-36"
        />
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note (Optional)"
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={handleAddManual}
          disabled={disabled || !minutes}
        >
          <Plus className="size-4" />
          Log
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
            >
              <span className="w-16 shrink-0 font-medium text-foreground">
                {entry.durationMinutes
                  ? formatMinutes(entry.durationMinutes)
                  : "Running"}
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {entry.userName ?? ""}
                {entry.note ? ` — ${entry.note}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(entry.startedAt)}
              </span>
              {entry.endedAt && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteEntry(entry.id)}
                  className="hover-reveal text-muted-foreground hover:text-destructive"
                  aria-label="Delete time entry"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </TaskSection>
  );
};
