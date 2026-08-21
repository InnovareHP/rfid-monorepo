import type { TaskChecklistItemDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import { Progress } from "@dashboard/ui/components/progress";
import { cn } from "@dashboard/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { TaskSection } from "./task-section";

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
    <TaskSection
      title="Checklist"
      action={
        items.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {done}/{items.length}
          </span>
        )
      }
    >
      {items.length > 0 && (
        <Progress value={(done / items.length) * 100} className="h-1.5" />
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded px-1 py-1 hover:bg-muted"
          >
            <Checkbox
              checked={item.isDone}
              disabled={disabled}
              onCheckedChange={(checked) => onToggle(item.id, Boolean(checked))}
            />
            <span
              className={cn(
                "flex-1 text-sm text-foreground",
                item.isDone && "text-muted-foreground line-through"
              )}
            >
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => onDelete(item.id)}
              className="hover-reveal text-muted-foreground hover:text-destructive"
              aria-label="Delete checklist item"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Checkbox checked={false} disabled aria-hidden />
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add Checklist Item"
          className="flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAdd}
          disabled={disabled || !title.trim()}
          aria-label="Add checklist item"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </TaskSection>
  );
};
