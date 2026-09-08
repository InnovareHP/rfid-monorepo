import { moduleIcon } from "@/lib/helper/module-icons";
import type { CrmModule } from "@/services/module/module-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Input } from "@dashboard/ui/components/input";
import { Switch } from "@dashboard/ui/components/switch";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type ModuleManageRowProps = {
  module: CrmModule;
  groupOptions: string[];
  disabled: boolean;
  onRename: (label: string) => void;
  onGroupChange: (groupName: string | null) => void;
  onArchivedChange: (isArchived: boolean) => void;
};

export function ModuleManageRow({
  module,
  groupOptions,
  disabled,
  onRename,
  onGroupChange,
  onArchivedChange,
}: ModuleManageRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id });
  const Icon = moduleIcon(module.icon);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={`Reorder ${module.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Icon className="size-4 shrink-0 text-muted-foreground" />

      <Input
        defaultValue={module.label}
        disabled={disabled}
        aria-label="Module name"
        className="min-w-40 flex-1"
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next && next !== module.label) onRename(next);
        }}
      />

      <Input
        defaultValue={module.groupName ?? ""}
        disabled={disabled}
        list="module-manage-groups"
        placeholder="No group"
        aria-label="Sidebar group"
        className="min-w-36 flex-1"
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next !== (module.groupName ?? "")) onGroupChange(next || null);
        }}
      />

      <datalist id="module-manage-groups">
        {groupOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {module.isSystem ? (
        <Badge variant="secondary" className="shrink-0 font-normal">
          Built in
        </Badge>
      ) : (
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={!module.isArchived}
            disabled={disabled}
            onCheckedChange={(checked) => onArchivedChange(!checked)}
          />
          {module.isArchived ? "Archived" : "Active"}
        </label>
      )}
    </div>
  );
}
