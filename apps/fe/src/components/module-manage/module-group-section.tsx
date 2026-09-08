import { ModuleManageRow } from "@/components/module-manage/module-manage-row";
import type { CrmModule } from "@/services/module/module-service";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@dashboard/ui/lib/utils";
import { Folder, Trash2 } from "lucide-react";

// The top level is a drop target like any folder, so a module leaves one by
// being dragged out rather than through a separate control.
export const UNGROUPED_ID = "ungrouped";

type ModuleGroupSectionProps = {
  id: string;
  name: string;
  modules: CrmModule[];
  disabled: boolean;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  onRenameModule: (moduleId: string, label: string) => void;
  onArchivedChange: (moduleId: string, isArchived: boolean) => void;
};

export function ModuleGroupSection({
  id,
  name,
  modules,
  disabled,
  onRename,
  onDelete,
  onRenameModule,
  onArchivedChange,
}: ModuleGroupSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-3 transition-colors",
        isOver && "border-brand bg-brand/5"
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <Folder className="size-4 shrink-0 text-muted-foreground" />

        {onRename ? (
          <Input
            defaultValue={name}
            disabled={disabled}
            maxLength={40}
            aria-label="Group name"
            className="h-8 max-w-56 border-transparent bg-transparent font-medium shadow-none hover:border-border focus-visible:border-border focus-visible:bg-background"
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next && next !== name) onRename(next);
            }}
          />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">
            {name}
          </span>
        )}

        <span className="text-xs text-muted-foreground">
          {modules.length} {modules.length === 1 ? "module" : "modules"}
        </span>

        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={`Delete ${name}`}
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </header>

      <SortableContext
        items={modules.map((module) => module.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {modules.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Drag a module here
            </p>
          ) : (
            modules.map((module) => (
              <ModuleManageRow
                key={module.id}
                module={module}
                disabled={disabled}
                onRename={(label) => onRenameModule(module.id, label)}
                onArchivedChange={(isArchived) =>
                  onArchivedChange(module.id, isArchived)
                }
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
