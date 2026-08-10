import { Skeleton } from "@dashboard/ui/components/skeleton";
import {
  getKanbanConfig,
  updateKanbanStages,
  type KanbanConfig,
  type StageType,
} from "@/services/kanban/kanban-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const STAGE_TYPES: StageType[] = ["OPEN", "WON", "LOST"];

type StageDraft = KanbanConfig["stages"][number];

export function KanbanSettingsDialog({
  open,
  setOpen,
  moduleType = "LEAD",
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  moduleType?: string;
}) {
  const { data: config } = useQuery({
    queryKey: ["kanban-config", moduleType],
    queryFn: () => getKanbanConfig(moduleType),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kanban settings</DialogTitle>
        </DialogHeader>

        {config ? (
          <KanbanSettingsForm
            key={config.stageField?.id ?? "unset"}
            config={config}
            moduleType={moduleType}
            setOpen={setOpen}
          />
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KanbanSettingsForm({
  config,
  moduleType,
  setOpen,
}: {
  config: KanbanConfig;
  moduleType: string;
  setOpen: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [stages, setStages] = useState<StageDraft[]>(config.stages);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateKanbanStages({
        moduleType,
        stages: stages.map((stage, index) => ({
          optionId: stage.id,
          optionOrder: index,
          stageType: stage.stageType,
          probability: stage.probability,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban", moduleType] });
      queryClient.invalidateQueries({
        queryKey: ["kanban-config", moduleType],
      });
      toast.success("Kanban settings saved");
      setOpen(false);
    },
    onError: () => toast.error("Failed to save Kanban settings"),
  });

  const updateStage = (id: string, patch: Partial<StageDraft>) => {
    setStages((prev) =>
      prev.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage))
    );
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (!config.stageField) {
    return (
      <p className="text-sm text-muted-foreground">
        This module has no status field, so there is nothing to group by yet. Add
        a status field to the board first.
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Columns come from the <strong>{config.stageField.name}</strong> field.
        Set each stage's outcome and, for open stages, how likely it is to close.
      </p>

      <div className="space-y-2">
        <Label>Stages</Label>
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex items-center gap-2 rounded-md border border-border p-2"
          >
            <span className="flex-1 truncate text-sm">{stage.optionName}</span>

            <Select
              value={stage.stageType}
              onValueChange={(value) =>
                updateStage(stage.id, { stageType: value as StageType })
              }
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min={0}
              max={100}
              className="w-20"
              placeholder="%"
              disabled={stage.stageType !== "OPEN"}
              value={stage.probability ?? ""}
              onChange={(event) =>
                updateStage(stage.id, {
                  probability: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => moveStage(index, -1)}
            >
              Up
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveStage(index, 1)}
            >
              Down
            </Button>
          </div>
        ))}
        {!stages.length && (
          <p className="text-sm text-muted-foreground">
            {config.stageField.name} has no options yet. Add options to the field
            to build the board.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!stages.length || saveMutation.isPending}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
