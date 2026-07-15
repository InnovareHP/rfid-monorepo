import type { TaskChecklistItemDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import { Progress } from "@dashboard/ui/components/progress";
import { cn } from "@dashboard/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type ChecklistSectionProps = {
  items: TaskChecklistItemDto[];
  onAdd: (title: string) => void;
  onToggle: (itemId: string, isDone: boolean) => void;
  onDelete: (itemId: string) => void;
  disabled?: boolean;
};

export const ChecklistSection = ({
  items,
  onAdd,
  onToggle,
  onDelete,
  disabled,
}: ChecklistSectionProps) => {
  const [title, setTitle] = useState("");
  const done = items.filter((item) => item.isDone).length;

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Checklist</h4>
        {items.length > 0 && (
          <span className="text-xs text-gray-500">
            {done}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <Progress value={(done / items.length) * 100} className="h-1.5" />
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-gray-50"
          >
            <Checkbox
              checked={item.isDone}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onToggle(item.id, Boolean(checked))
              }
            />
            <span
              className={cn(
                "flex-1 text-sm text-gray-800",
                item.isDone && "line-through text-gray-400"
              )}
            >
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onDelete(item.id)}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
              aria-label="Delete checklist item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add checklist item"
          className="h-8"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !title.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
