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
import { Plus, Tag } from "lucide-react";
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
          className="text-xs"
          style={{ borderColor: label.color, color: label.color }}
        >
          {label.name}
        </Badge>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={disabled}
          >
            <Tag className="h-3.5 w-3.5 mr-1" />
            Labels
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2" align="start">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {labels.length === 0 && (
              <p className="text-xs text-gray-400">No labels yet</p>
            )}
            {labels.map((label) => (
              <label
                key={label.id}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(label.id)}
                  onCheckedChange={() => toggle(label.id)}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="text-sm text-gray-800">{label.name}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
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
