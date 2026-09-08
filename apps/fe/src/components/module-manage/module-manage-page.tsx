import { ModuleManageRow } from "@/components/module-manage/module-manage-row";
import { PageHeader } from "@/components/page-header";
import { MODULES_KEY, useModules } from "@/hooks/use-modules";
import { NAV_KEY } from "@/hooks/use-nav-data";
import {
  reorderModules,
  updateModule,
  type CrmModule,
  type UpdateModuleInput,
} from "@/services/module/module-service";
import { Spinner } from "@dashboard/ui/components/spinner";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function ModuleManagePage() {
  const queryClient = useQueryClient();
  const { data: modules = [], isLoading } = useModules({
    includeArchived: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: MODULES_KEY });
    queryClient.invalidateQueries({ queryKey: NAV_KEY });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateModuleInput }) =>
      updateModule(id, input),
    onSuccess: refresh,
    onError: () => toast.error("Could not save that change."),
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

  const groupOptions = [
    ...new Set(
      modules.flatMap((module) => (module.groupName ? [module.groupName] : []))
    ),
  ];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((module) => module.id === active.id);
    const newIndex = modules.findIndex((module) => module.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderMutation.mutate(
      arrayMove(modules, oldIndex, newIndex).map((module) => module.id)
    );
  };

  const isSaving = updateMutation.isPending || reorderMutation.isPending;

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader
          title="Manage modules"
          description="Rename a module, file it under a sidebar group, reorder the list, or archive one you no longer use."
        />

        {isLoading ? (
          <Spinner />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={modules.map((module) => module.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {modules.map((module) => (
                  <ModuleManageRow
                    key={module.id}
                    module={module}
                    groupOptions={groupOptions}
                    disabled={isSaving}
                    onRename={(label) =>
                      updateMutation.mutate({ id: module.id, input: { label } })
                    }
                    onGroupChange={(groupName) =>
                      updateMutation.mutate({
                        id: module.id,
                        input: { groupName },
                      })
                    }
                    onArchivedChange={(isArchived) =>
                      updateMutation.mutate({
                        id: module.id,
                        input: { isArchived },
                      })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
