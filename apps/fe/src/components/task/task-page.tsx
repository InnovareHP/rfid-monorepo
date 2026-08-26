import { WriteGate } from "@/components/write-gate";
import { PageHeader } from "@/components/page-header";
import {
  useTaskLists,
  useTaskMutations,
  useTaskProjectMutations,
  useTaskProjects,
  useTasks,
  useTaskStatuses,
} from "@/hooks/use-tasks";
import {
  buildTaskInsights,
  buildTaskStats,
  buildTaskStatusSlices,
  sortTasks,
  type TaskSort,
} from "@/lib/helper/task-insights";
import type { CreateTaskPayload, TaskListItemDto } from "@dashboard/shared";
import type { Member } from "better-auth/plugins/organization";
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
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useRouteContext } from "@tanstack/react-router";
import { ClipboardList, ListPlus, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBreakdownCard } from "../analytics/charts/status-breakdown-card";
import {
  LogEmptyState,
  LogTableSkeleton,
} from "../log-shared/log-page-shell";
import { ListFormDialog } from "./list-form-dialog";
import { ProjectSelector } from "./project-selector";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskInsightCard } from "./task-insight-card";
import { TaskStatsStrip } from "./task-stats-strip";
import { TaskTable } from "./task-table";

const TaskPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [sort, setSort] = useState<TaskSort | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // The org id already rides in the route context, so this avoids a per-mount
  // auth fetch and the undefined first render that flickered role-gated UI.
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);

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
  const tasks = useMemo(() => tasksQuery.data?.data ?? [], [tasksQuery.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const stats = useMemo(
    () => buildTaskStats(tasks, memberData?.id),
    [tasks, memberData?.id]
  );
  const insights = useMemo(() => buildTaskInsights(stats), [stats]);
  const statusSlices = useMemo(
    () => buildTaskStatusSlices(tasks, statuses),
    [tasks, statuses]
  );

  const tasksByList = useMemo(() => {
    const grouped = new Map<string, TaskListItemDto[]>();
    for (const task of tasks) {
      const existing = grouped.get(task.listId) ?? [];
      existing.push(task);
      grouped.set(task.listId, existing);
    }
    for (const [listId, group] of grouped) {
      grouped.set(listId, sortTasks(group, sort));
    }
    return grouped;
  }, [tasks, sort]);

  // Pagination runs over the lists in order so a page never splits a list oddly.
  const orderedTasks = useMemo(
    () => lists.flatMap((list) => tasksByList.get(list.id) ?? []),
    [lists, tasksByList]
  );

  const totalPages = Math.max(Math.ceil(orderedTasks.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);

  const pagedTasksByList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const grouped = new Map<string, TaskListItemDto[]>();
    for (const task of orderedTasks.slice(start, start + pageSize)) {
      const existing = grouped.get(task.listId) ?? [];
      existing.push(task);
      grouped.set(task.listId, existing);
    }
    return grouped;
  }, [orderedTasks, currentPage, pageSize]);

  const countsByList = useMemo(
    () =>
      new Map(
        lists.map((list) => [list.id, tasksByList.get(list.id)?.length ?? 0])
      ),
    [lists, tasksByList]
  );

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
        const newIndex = listTasks.findIndex((task) => task.id === overTask.id);
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

  const handleAddList = (name: string) => {
    if (!activeProjectId) return;
    createListMutation.mutate({ name, projectId: activeProjectId });
    setListDialogOpen(false);
  };

  // Subtasks are separate records, so the parent is created first and its id reused.
  const handleCreateTask = async (
    payload: CreateTaskPayload,
    subtaskNames: string[]
  ) => {
    setCreateOpen(false);
    try {
      const parent = await createTaskMutation.mutateAsync(payload);
      for (const name of subtaskNames) {
        await createTaskMutation.mutateAsync({
          ...payload,
          name,
          parentTaskId: parent.id,
        });
      }
    } catch {
      // The mutation already surfaces the failure as a toast.
    }
  };

  const isLoading =
    projectsQuery.isLoading || listsQuery.isLoading || tasksQuery.isLoading;

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader
        title="Tasks"
        description="Plan, assign, and track work across your team."
      />

        <TaskStatsStrip stats={stats} isLoading={isLoading} />

        <div className="grid gap-4 lg:grid-cols-3">
          <TaskInsightCard
            insights={insights}
            isLoading={isLoading}
            className="lg:col-span-2"
          />
          <StatusBreakdownCard
            slices={statusSlices}
            title="Tasks Summary"
            totalLabel="Total tasks"
            activeSuffix=""
          />
        </div>

        <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center">
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

          <div className="relative max-w-sm min-w-48 flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search tasks..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={includeArchived}
              onCheckedChange={(checked) => {
                setIncludeArchived(checked);
                setPage(1);
              }}
            />
            <Label htmlFor="show-archived" className="text-sm text-gray-600">
              Show archived
            </Label>
          </div>

          <div className="flex items-center gap-3 sm:ml-auto">
            <WriteGate>
              <Button
                className="bg-brand text-white hover:bg-brand/90"
                onClick={() => setCreateOpen(true)}
                disabled={!activeProjectId}
              >
                <Plus className="mr-1 h-4 w-4" />
                New Tasks
              </Button>
            </WriteGate>

            <WriteGate>
              <Button
                className="bg-brand text-white hover:bg-brand/90"
                onClick={() => setListDialogOpen(true)}
                disabled={!activeProjectId}
              >
                <ListPlus className="mr-1 h-4 w-4" />
                New List
              </Button>
            </WriteGate>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <TaskTable
              lists={lists}
              pagedTasksByList={pagedTasksByList}
              countsByList={countsByList}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setPage(1);
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={orderedTasks.length}
              completedCount={
                orderedTasks.filter((task) => Boolean(task.completedAt)).length
              }
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onToggleComplete={(task) =>
                completeTaskMutation.mutate({
                  id: task.id,
                  completed: Boolean(task.completedAt),
                })
              }
              onOpenTask={openTask}
            />
          </DndContext>
        )}

        <ListFormDialog
          key={`list-${listDialogOpen}`}
          open={listDialogOpen}
          onOpenChange={setListDialogOpen}
          submitting={createListMutation.isPending}
          onSubmit={handleAddList}
        />

        {activeProjectId && (
          <TaskFormDialog
            key={`${activeProjectId}-${createOpen}`}
            open={createOpen}
            onOpenChange={setCreateOpen}
            projectId={activeProjectId}
            lists={lists.filter((list) => !list.id.startsWith("temp-"))}
            statuses={statuses}
            submitting={createTaskMutation.isPending}
            onSubmit={handleCreateTask}
          />
        )}
      </div>
    </div>
  );
};

export default TaskPage;
