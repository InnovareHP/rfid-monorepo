import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ModuleGroupDialog } from "@/components/module-manage/module-group-dialog";
import {
  ModuleGroupSection,
  UNGROUPED_ID,
} from "@/components/module-manage/module-group-section";
import { PageHeader } from "@/components/page-header";
import { MODULE_GROUPS_KEY, useModuleGroups } from "@/hooks/use-module-groups";
import { MODULES_KEY, useModules } from "@/hooks/use-modules";
import { NAV_KEY } from "@/hooks/use-nav-data";
import {
  deleteModuleGroup,
  renameModuleGroup,
} from "@/services/module/module-group-service";
import {
  reorderModules,
  updateModule,
  type CrmModule,
  type UpdateModuleInput,
} from "@/services/module/module-service";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ModuleManagePage() {
  const { newGroup } = useSearch({ from: "/_team/$team/settings/modules" });
  const queryClient = useQueryClient();
  const { data: modules = [], isLoading } = useModules({
    includeArchived: true,
  });
  const { data: groups = [] } = useModuleGroups();
  const [creating, setCreating] = useState(newGroup);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: MODULES_KEY });
    queryClient.invalidateQueries({ queryKey: MODULE_GROUPS_KEY });
    queryClient.invalidateQueries({ queryKey: NAV_KEY });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateModuleInput }) =>
      updateModule(id, input),
    // A dropped row has to land where it was let go, so the refile is written
    // to the cache before the request answers.
    onMutate: async ({ id, input }) => {
      if (input.groupId === undefined) return;

      await queryClient.cancelQueries({ queryKey: MODULES_KEY });
      const previous = queryClient.getQueryData<CrmModule[]>(MODULES_KEY);

      queryClient.setQueryData<CrmModule[]>(MODULES_KEY, (old) =>
        old?.map((module) =>
          module.id === id
            ? {
                ...module,
                groupId: input.groupId ?? null,
                groupName:
                  groups.find((group) => group.id === input.groupId)?.name ??
                  null,
              }
            : module
        )
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MODULES_KEY, context.previous);
      }
      toast.error("Could not save that change.");
    },
    onSuccess: refresh,
  });

  const reorderMutation = useMutation({
    mutationFn: (moduleIds: string[]) => reorderModules(moduleIds),
    // The list is already showing the new order, so only a failure needs to
    // touch the cache.
    onMutate: async (moduleIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: MODULES_KEY });
      const previous = queryClient.getQueryData<CrmModule[]>(MODULES_KEY);

      queryClient.setQueryData<CrmModule[]>(MODULES_KEY, (old) =>
        old
          ? moduleIds.flatMap((id, index) => {
              const module = old.find((row) => row.id === id);
              return module ? [{ ...module, moduleOrder: index }] : [];
            })
          : old
      );

      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MODULES_KEY, context.previous);
      }
      toast.error("Could not save the new order.");
    },
    onSuccess: refresh,
  });

  const errorMessage = (error: unknown, fallback: string) =>
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback;

  const renameGroupMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameModuleGroup(id, name),
    onSuccess: refresh,
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "Could not rename that group.")),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => deleteModuleGroup(id),
    onSuccess: () => {
      toast.success("Group deleted");
      refresh();
    },
    onError: () => toast.error("Could not delete that group."),
  });

  const isSaving =
    updateMutation.isPending ||
    reorderMutation.isPending ||
    renameGroupMutation.isPending ||
    deleteGroupMutation.isPending;

  const sectionIdOf = (module: CrmModule) => module.groupId ?? UNGROUPED_ID;

  // A drop on the section itself carries the section id; a drop on a row
  // carries the row's, so the folder comes from that row.
  const targetSectionId = (overId: string) => {
    if (
      overId === UNGROUPED_ID ||
      groups.some((group) => group.id === overId)
    ) {
      return overId;
    }

    const overModule = modules.find((module) => module.id === overId);
    return overModule ? sectionIdOf(overModule) : null;
  };

  // Crossing folders is a refile and keeps the module's place in the order;
  // staying put is a reorder of the whole visible list.
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;

    const dragged = modules.find((module) => module.id === active.id);
    const target = targetSectionId(String(over.id));
    if (!dragged || !target) return;

    if (target !== sectionIdOf(dragged)) {
      updateMutation.mutate({
        id: dragged.id,
        input: { groupId: target === UNGROUPED_ID ? null : target },
      });
      return;
    }

    if (active.id === over.id) return;

    const oldIndex = modules.findIndex((module) => module.id === active.id);
    const newIndex = modules.findIndex((module) => module.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderMutation.mutate(
      arrayMove(modules, oldIndex, newIndex).map((module) => module.id)
    );
  };

  const groupBeingDeleted = groups.find((group) => group.id === pendingDelete);

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader
          title="Manage modules"
          description="Drag a module into a group to refile it, rename a group in place, reorder the list, or archive a module you no longer use."
        />

        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <FolderPlus className="size-4" />
              New group
            </Button>

            <ModuleGroupDialog open={creating} onOpenChange={setCreating} />

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-3">
                <ModuleGroupSection
                  id={UNGROUPED_ID}
                  name="No group"
                  modules={modules.filter((module) => !module.groupId)}
                  disabled={isSaving}
                  onRenameModule={(id, label) =>
                    updateMutation.mutate({ id, input: { label } })
                  }
                  onArchivedChange={(id, isArchived) =>
                    updateMutation.mutate({ id, input: { isArchived } })
                  }
                />

                {groups.map((group) => (
                  <ModuleGroupSection
                    key={group.id}
                    id={group.id}
                    name={group.name}
                    modules={modules.filter(
                      (module) => module.groupId === group.id
                    )}
                    disabled={isSaving}
                    onRename={(name) =>
                      renameGroupMutation.mutate({ id: group.id, name })
                    }
                    onDelete={() => setPendingDelete(group.id)}
                    onRenameModule={(id, label) =>
                      updateMutation.mutate({ id, input: { label } })
                    }
                    onArchivedChange={(id, isArchived) =>
                      updateMutation.mutate({ id, input: { isArchived } })
                    }
                  />
                ))}
              </div>
            </DndContext>
          </>
        )}
      </div>

      <ConfirmationDialog
        open={Boolean(groupBeingDeleted)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${groupBeingDeleted?.name ?? "group"}?`}
        description="The group is a sidebar folder only. Its modules and their records stay, and move back to the top level."
        confirmText="Delete group"
        variant="destructive"
        onConfirm={() => {
          if (pendingDelete) deleteGroupMutation.mutate(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
