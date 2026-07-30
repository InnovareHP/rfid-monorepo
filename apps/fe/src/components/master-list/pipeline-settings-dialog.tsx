import {
  getPipelineConfig,
  setPipelineConfig,
  updatePipelineStages,
  type PipelineConfig,
  type StageType,
} from "@/services/pipeline/pipeline-service";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STAGE_TYPES: StageType[] = ["OPEN", "WON", "LOST"];

type StageDraft = PipelineConfig["stages"][number];

export function PipelineSettingsDialog({
  open,
  setOpen,
  moduleType = "LEAD",
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  moduleType?: string;
}) {
  const queryClient = useQueryClient();
  const [stageFieldId, setStageFieldId] = useState<string>("");
  const [amountFieldId, setAmountFieldId] = useState<string>("");
  const [stages, setStages] = useState<StageDraft[]>([]);

  const { data: config } = useQuery({
    queryKey: ["pipeline-config", moduleType],
    queryFn: () => getPipelineConfig(moduleType),
    enabled: open,
  });

  useEffect(() => {
    if (!config) return;
    setStageFieldId(config.stageFieldId ?? "");
    setAmountFieldId(config.amountFieldId ?? "");
    setStages(config.stages);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await setPipelineConfig({
        moduleType,
        stageFieldId,
        amountFieldId: amountFieldId || null,
      });
      // Stage rows belong to the saved stage field, so skip them when it changes
      if (stages.length && stageFieldId === config?.stageFieldId) {
        await updatePipelineStages({
          moduleType,
          stages: stages.map((stage, index) => ({
            optionId: stage.id,
            optionOrder: index,
            stageType: stage.stageType,
            probability: stage.probability,
          })),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", moduleType] });
      queryClient.invalidateQueries({
        queryKey: ["pipeline-config", moduleType],
      });
      toast.success("Pipeline settings saved");
      setOpen(false);
    },
    onError: () => toast.error("Failed to save pipeline settings"),
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pipeline settings</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Stage field</Label>
            <Select value={stageFieldId} onValueChange={setStageFieldId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status field" />
              </SelectTrigger>
              <SelectContent>
                {config?.stageCandidates.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Deal value field</Label>
            <Select value={amountFieldId} onValueChange={setAmountFieldId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a number field" />
              </SelectTrigger>
              <SelectContent>
                {config?.amountCandidates.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Stages</Label>
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 rounded-md border border-gray-200 p-2"
            >
              <span className="flex-1 truncate text-sm">
                {stage.optionName}
              </span>

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
            <p className="text-sm text-gray-500">
              Pick a stage field to configure its stages.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!stageFieldId || saveMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
