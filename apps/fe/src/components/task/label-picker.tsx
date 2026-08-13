import { useTaskLabelMutations, useTaskLabels } from "@/hooks/use-tasks";
import type { TaskLabelDto } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { Plus, Tag, X } from "lucide-react";
import { useState } from "react";

const LABEL_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#6b7280",
];

type LabelPickerProps = {
  selected: TaskLabelDto[];
  onChange: (labelIds: string[]) => void;
  disabled?: boolean;
};

export const LabelPicker = ({
  selected,
  onChange,
  disabled,
}: LabelPickerProps) => {
  const labelsQuery = useTaskLabels();
  const { createLabelMutation } = useTaskLabelMutations();
  const [newName, setNewName] = useState("");

  const labels = labelsQuery.data ?? [];
  const selectedIds = new Set(selected.map((label) => label.id));

  const remove = (labelId: string) =>
    onChange(selected.filter((label) => label.id !== labelId).map((label) => label.id));

  const toggle = (labelId: string) => {
    const next = new Set(selectedIds);
    if (next.has(labelId)) {
      next.delete(labelId);
    } else {
      next.add(labelId);
    }
    onChange([...next]);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createLabelMutation.mutate({
      name: newName.trim(),
      color: LABEL_COLORS[labels.length % LABEL_COLORS.length],
    });
    setNewName("");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selected.map((label) => (
        <Badge
          key={label.id}
          variant="outline"
          className="gap-1.5 rounded-full py-1"
          style={{ borderColor: label.color, color: label.color }}
        >
          {label.name}
          <button
            type="button"
            disabled={disabled}
            onClick={() => remove(label.id)}
            aria-label={`Remove ${label.name}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="border-dashed text-muted-foreground"
            disabled={disabled}
          >
            <Tag className="size-4" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2" align="start">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {labels.length === 0 && (
              <p className="text-xs text-muted-foreground">No labels yet</p>
            )}
            {labels.map((label) => (
              <label
                key={label.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted"
              >
                <Checkbox
                  checked={selectedIds.has(label.id)}
                  onCheckedChange={() => toggle(label.id)}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="text-sm text-foreground">{label.name}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t pt-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New label"
              className="h-8"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreate();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreate}
              disabled={!newName.trim() || createLabelMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
