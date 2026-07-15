import {
  useTaskLists,
  useTaskMutations,
  useTaskProjectMutations,
  useTaskProjects,
  useTasks,
  useTaskStatuses,
} from "@/hooks/use-tasks";
import type { TaskListItemDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Switch } from "@dashboard/ui/components/switch";
import {
  closestCorners,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ClipboardList, ListPlus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  LogEmptyState,
  LogPageHeader,
  LogTableSkeleton,
} from "../log-shared/log-page-shell";
import { ProjectSelector } from "./project-selector";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskListSection } from "./task-list-section";

const TaskPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const projectsQuery = useTaskProjects();
  const projects = projectsQuery.data ?? [];
  const activeProjectId =
    selectedProjectId ??
    projects.find((project) => !project.id.startsWith("temp-"))?.id ??
    null;

  const listsQuery = useTaskLists(activeProjectId ?? undefined);
  const statusesQuery = useTaskStatuses();
  const tasksQuery = useTasks({
    projectId: activeProjectId ?? "",
    includeArchived,
    search: search || undefined,
    page: 1,
    limit: 500,
  });

  const { createTaskMutation, completeTaskMutation, reorderTaskMutation } =
    useTaskMutations();
  const { createProjectMutation, updateProjectMutation, createListMutation } =
    useTaskProjectMutations();

  const lists = listsQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];
  const tasks = tasksQuery.data?.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksByList = useMemo(() => {
    const grouped = new Map<string, TaskListItemDto[]>();
    for (const task of tasks) {
      const existing = grouped.get(task.listId) ?? [];
      existing.push(task);
      grouped.set(task.listId, existing);
    }
    for (const group of grouped.values()) {
      group.sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [tasks]);

  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = taskById.get(String(active.id));
    if (!activeTask || activeTask.id.startsWith("temp-")) return;

    const overTask = taskById.get(String(over.id));
    if (overTask?.id.startsWith("temp-")) return;
    const targetListId = overTask ? overTask.listId : String(over.id);
    if (targetListId.startsWith("temp-")) return;
    if (!overTask && !lists.some((list) => list.id === targetListId)) return;

    let beforeTaskId: string | null = null;
    if (overTask) {
      if (targetListId === activeTask.listId) {
        const listTasks = tasksByList.get(targetListId) ?? [];
        const oldIndex = listTasks.findIndex(
          (task) => task.id === activeTask.id
        );
        const newIndex = listTasks.findIndex(
          (task) => task.id === overTask.id
        );
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(listTasks, oldIndex, newIndex);
        const movedIndex = reordered.findIndex(
          (task) => task.id === activeTask.id
        );
        beforeTaskId = reordered[movedIndex + 1]?.id ?? null;
      } else {
        beforeTaskId = overTask.id;
      }
    } else if (targetListId === activeTask.listId) {
      return;
    }

    reorderTaskMutation.mutate({
      taskId: activeTask.id,
      listId: targetListId,
      beforeTaskId,
    });
  };

  const openTask = (task: TaskListItemDto) => {
    if (task.id.startsWith("temp-")) return;
    navigate({
      to: "/$team/tasks/$task",
      params: { team, task: task.id },
    });
  };

  const handleAddList = () => {
    if (!newListName.trim() || !activeProjectId) return;
    createListMutation.mutate({
      name: newListName.trim(),
      projectId: activeProjectId,
    });
    setNewListName("");
  };

  const isLoading =
    projectsQuery.isLoading || listsQuery.isLoading || tasksQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <LogPageHeader
          icon={ClipboardList}
          title="Tasks"
          subtitle="Plan, assign, and track work across your team"
          actionLabel="New Task"
          onAction={() => setCreateOpen(true)}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
          <ProjectSelector
            projects={projects}
            selectedProjectId={activeProjectId}
            onSelect={setSelectedProjectId}
            onCreate={(name) => createProjectMutation.mutate({ name })}
            onArchive={(projectId) => {
              updateProjectMutation.mutate({
                id: projectId,
                data: { isArchived: true },
              });
              setSelectedProjectId(null);
            }}
            creating={createProjectMutation.isPending}
          />

          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
            <Label htmlFor="show-archived" className="text-sm text-gray-600">
              Show archived
            </Label>
          </div>
        </div>

        {isLoading ? (
          <LogTableSkeleton />
        ) : !activeProjectId ? (
          <LogEmptyState
            icon={ClipboardList}
            title="No projects yet"
            description="Create your first project to start organizing tasks."
            actionLabel="New Project"
            onAction={() =>
              createProjectMutation.mutate({ name: "My Project" })
            }
          />
        ) : (
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
            >
              {lists.map((list) => (
                <TaskListSection
                  key={list.id}
                  list={list}
                  tasks={tasksByList.get(list.id) ?? []}
                  onToggleComplete={(task) =>
                    completeTaskMutation.mutate({
                      id: task.id,
                      completed: Boolean(task.completedAt),
                    })
                  }
                  onOpenTask={openTask}
                />
              ))}
            </DndContext>

            <div className="flex items-center gap-2 max-w-sm">
              <Input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="New list name"
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddList();
                }}
              />
              <Button
                variant="outline"
                onClick={handleAddList}
                disabled={!newListName.trim() || createListMutation.isPending}
              >
                <ListPlus className="h-4 w-4 mr-1" />
                Add List
              </Button>
            </div>
          </div>
        )}

        {activeProjectId && (
          <TaskFormDialog
            key={`${activeProjectId}-${createOpen}`}
            open={createOpen}
            onOpenChange={setCreateOpen}
            projectId={activeProjectId}
            lists={lists.filter((list) => !list.id.startsWith("temp-"))}
            statuses={statuses}
            submitting={createTaskMutation.isPending}
            onSubmit={(payload) => {
              createTaskMutation.mutate(payload);
              setCreateOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TaskPage;
