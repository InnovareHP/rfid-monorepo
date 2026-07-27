import {
  addChecklistItem,
  addTaskAttachment,
  addTaskComment,
  addTaskDependency,
  addTaskTimeEntry,
  completeTask,
  createTask,
  createTaskLabel,
  createTaskList,
  createTaskProject,
  deleteChecklistItem,
  deleteTask,
  deleteTaskAttachment,
  deleteTaskComment,
  deleteTaskLabel,
  deleteTaskList,
  deleteTaskProject,
  deleteTaskTimeEntry,
  duplicateTask,
  getRunningTimer,
  getTaskActivity,
  getTaskById,
  getTaskComments,
  getTaskLabels,
  getTaskLists,
  getTaskProjects,
  getTasks,
  getTaskStatuses,
  getTaskTimeEntries,
  removeTaskDependency,
  reorderTask,
  setTaskAssignees,
  setTaskLabels,
  startTaskTimer,
  stopTaskTimer,
  uncompleteTask,
  updateChecklistItem,
  updateTask,
  updateTaskComment,
  updateTaskList,
  updateTaskProject,
  type RunningTimer,
  type TaskListQuery,
} from "@/services/task/task-service";
import {
  TASK_PRIORITY,
  TASK_STATUS_CATEGORY,
  type CreateTaskPayload,
  type PaginatedResponse,
  type TaskCommentDto,
  type TaskDto,
  type TaskLabelDto,
  type TaskListDto,
  type TaskListItemDto,
  type TaskProjectDto,
  type TaskReorderPayload,
  type TaskStatusDto,
  type UpdateTaskPayload,
} from "@dashboard/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type TasksCache = PaginatedResponse<TaskListItemDto>;
type TaskCacheSnapshot = Array<[readonly unknown[], unknown]>;

export const useTaskProjects = (includeArchived?: boolean) =>
  useQuery({
    queryKey: ["task-projects", { includeArchived: Boolean(includeArchived) }],
    queryFn: () => getTaskProjects(includeArchived),
  });

export const useTaskLists = (projectId?: string) =>
  useQuery({
    queryKey: ["task-lists", projectId],
    queryFn: () => getTaskLists(projectId as string),
    enabled: Boolean(projectId),
  });

export const useTasks = (query: TaskListQuery) =>
  useQuery({
    queryKey: [
      "tasks",
      query.projectId,
      {
        listId: query.listId ?? null,
        includeArchived: Boolean(query.includeArchived),
        search: query.search ?? "",
      },
    ],
    queryFn: () => getTasks(query),
    enabled: Boolean(query.projectId),
  });

export const useTask = (taskId?: string) =>
  useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskById(taskId as string),
    enabled: Boolean(taskId),
  });

export const useTaskStatuses = () =>
  useQuery({
    queryKey: ["task-statuses"],
    queryFn: getTaskStatuses,
    staleTime: 30 * 60 * 1000,
  });

export const useTaskLabels = () =>
  useQuery({
    queryKey: ["task-labels"],
    queryFn: getTaskLabels,
  });

export const useTaskComments = (taskId?: string) =>
  useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => getTaskComments(taskId as string),
    enabled: Boolean(taskId),
  });

export const useTaskActivity = (taskId?: string) =>
  useQuery({
    queryKey: ["task-activity", taskId],
    queryFn: () => getTaskActivity(taskId as string),
    enabled: Boolean(taskId),
  });

export const useTaskTimeEntries = (taskId?: string) =>
  useQuery({
    queryKey: ["task-time-entries", taskId],
    queryFn: () => getTaskTimeEntries(taskId as string),
    enabled: Boolean(taskId),
  });

export const useRunningTimer = () =>
  useQuery({
    queryKey: ["running-timer"],
    queryFn: getRunningTimer,
    refetchInterval: 60 * 1000,
  });

const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  return async (taskId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    if (taskId) {
      await queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      await queryClient.invalidateQueries({
        queryKey: ["task-activity", taskId],
      });
    }
  };
};

export const useTaskMutations = () => {
  const queryClient = useQueryClient();
  const invalidateTasks = useInvalidateTasks();

  const listTaskCaches = () =>
    queryClient.getQueriesData<TasksCache>({ queryKey: ["tasks"] });

  const detailTaskCaches = () =>
    queryClient.getQueriesData<TaskDto>({ queryKey: ["task"] });

  const snapshotTaskCaches = (): TaskCacheSnapshot => [
    ...listTaskCaches(),
    ...detailTaskCaches(),
  ];

  const restoreTaskCaches = (snapshots: TaskCacheSnapshot) => {
    for (const [key, data] of snapshots) {
      queryClient.setQueryData(key, data);
    }
  };

  const patchTaskInCaches = (
    taskId: string,
    patch: Partial<TaskListItemDto>
  ) => {
    const snapshots = snapshotTaskCaches();
    for (const [key, cache] of listTaskCaches()) {
      if (!cache) continue;
      queryClient.setQueryData<TasksCache>(key, {
        ...cache,
        data: cache.data.map((task) =>
          task.id === taskId ? { ...task, ...patch } : task
        ),
      });
    }
    for (const [key, detail] of detailTaskCaches()) {
      if (!detail) continue;
      let next = detail;
      if (detail.id === taskId) {
        next = { ...next, ...patch };
      }
      if (detail.subtasks?.some((subtask) => subtask.id === taskId)) {
        next = {
          ...next,
          subtasks: detail.subtasks.map((subtask) =>
            subtask.id === taskId ? { ...subtask, ...patch } : subtask
          ),
        };
      }
      if (next !== detail) {
        queryClient.setQueryData<TaskDto>(key, next);
      }
    }
    return snapshots;
  };

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => createTask(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = snapshotTaskCaches();

      const statuses = queryClient.getQueryData<TaskStatusDto[]>([
        "task-statuses",
      ]);
      const status = data.statusId
        ? statuses?.find((item) => item.id === data.statusId)
        : statuses?.find(
            (item) => item.category === TASK_STATUS_CATEGORY.ACTIVE
          );
      if (!status) return { snapshots };

      const allLabels = queryClient.getQueryData<TaskLabelDto[]>([
        "task-labels",
      ]);
      const now = new Date().toISOString();
      const tempTask: TaskListItemDto = {
        id: `temp-${Date.now()}`,
        taskNumber: 0,
        name: data.name,
        priority: data.priority ?? TASK_PRIORITY.NORMAL,
        statusId: status.id,
        status,
        projectId: data.projectId,
        listId: data.listId,
        parentTaskId: data.parentTaskId ?? null,
        startDate: data.startDate ?? null,
        dueDate: data.dueDate ?? null,
        estimatedMinutes: data.estimatedMinutes ?? null,
        trackedMinutes: 0,
        position: 0,
        completedAt: null,
        isArchived: false,
        labels:
          allLabels?.filter((label) => data.labelIds?.includes(label.id)) ??
          [],
        assignees: [],
        checklistDone: 0,
        checklistTotal: 0,
        subtaskCount: 0,
        blockedByCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      for (const [key, cache] of listTaskCaches()) {
        if (!cache) continue;
        if (key[1] !== data.projectId) continue;
        const maxPosition = cache.data.reduce(
          (max, task) =>
            task.listId === data.listId ? Math.max(max, task.position) : max,
          0
        );
        queryClient.setQueryData<TasksCache>(key, {
          ...cache,
          total: cache.total + 1,
          data: [...cache.data, { ...tempTask, position: maxPosition + 1024 }],
        });
      }
      if (data.parentTaskId) {
        await queryClient.cancelQueries({
          queryKey: ["task", data.parentTaskId],
        });
        const parent = queryClient.getQueryData<TaskDto>([
          "task",
          data.parentTaskId,
        ]);
        if (parent) {
          queryClient.setQueryData<TaskDto>(["task", data.parentTaskId], {
            ...parent,
            subtasks: [...parent.subtasks, tempTask],
            subtaskCount: parent.subtaskCount + 1,
          });
        }
      }
      return { snapshots };
    },
    onSuccess: () => toast.success("Task created"),
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreTaskCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateTasks(variables.parentTaskId);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskPayload }) =>
      updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const patch: Partial<TaskListItemDto> = {};
      if (data.priority) patch.priority = data.priority;
      if (data.name) patch.name = data.name;
      if (data.isArchived !== undefined) patch.isArchived = data.isArchived;
      if (data.statusId) {
        const statuses = queryClient.getQueryData<TaskStatusDto[]>([
          "task-statuses",
        ]);
        const status = statuses?.find((item) => item.id === data.statusId);
        if (status) {
          patch.statusId = status.id;
          patch.status = status;
        }
      }
      return { snapshots: patchTaskInCaches(id, patch) };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreTaskCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateTasks(variables.id);
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      completed ? uncompleteTask(id) : completeTask(id),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const statuses = queryClient.getQueryData<TaskStatusDto[]>([
        "task-statuses",
      ]);
      const targetStatus = statuses?.find((status) =>
        completed
          ? status.category === TASK_STATUS_CATEGORY.ACTIVE
          : status.category === TASK_STATUS_CATEGORY.DONE
      );
      const patch: Partial<TaskListItemDto> = {
        completedAt: completed ? null : new Date().toISOString(),
      };
      if (targetStatus) {
        patch.statusId = targetStatus.id;
        patch.status = targetStatus;
      }
      return { snapshots: patchTaskInCaches(id, patch) };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreTaskCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateTasks(variables.id);
    },
  });

  const reorderTaskMutation = useMutation({
    mutationFn: (data: TaskReorderPayload) => reorderTask(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = snapshotTaskCaches();
      for (const [key, cache] of listTaskCaches()) {
        if (!cache) continue;
        const moved = cache.data.find((task) => task.id === data.taskId);
        if (!moved) continue;
        const remaining = cache.data.filter((task) => task.id !== data.taskId);
        const movedPatched = { ...moved, listId: data.listId };
        let insertAt = remaining.length;
        if (data.beforeTaskId) {
          const idx = remaining.findIndex(
            (task) => task.id === data.beforeTaskId
          );
          if (idx !== -1) insertAt = idx;
        } else {
          let lastInList = -1;
          remaining.forEach((task, index) => {
            if (task.listId === data.listId) lastInList = index;
          });
          insertAt = lastInList + 1 || remaining.length;
        }
        const nextData = [
          ...remaining.slice(0, insertAt),
          movedPatched,
          ...remaining.slice(insertAt),
        ].map((task, index) => ({ ...task, position: (index + 1) * 1024 }));
        queryClient.setQueryData<TasksCache>(key, {
          ...cache,
          data: nextData,
        });
      }
      return { snapshots };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreTaskCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateTasks(variables.taskId);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = snapshotTaskCaches();
      for (const [key, cache] of listTaskCaches()) {
        if (!cache) continue;
        queryClient.setQueryData<TasksCache>(key, {
          ...cache,
          total: Math.max(cache.total - 1, 0),
          data: cache.data.filter(
            (task) => task.id !== id && task.parentTaskId !== id
          ),
        });
      }
      for (const [key, detail] of detailTaskCaches()) {
        if (!detail?.subtasks?.some((subtask) => subtask.id === id)) continue;
        queryClient.setQueryData<TaskDto>(key, {
          ...detail,
          subtasks: detail.subtasks.filter((subtask) => subtask.id !== id),
          subtaskCount: Math.max(detail.subtaskCount - 1, 0),
        });
      }
      return { snapshots };
    },
    onSuccess: () => toast.success("Task deleted"),
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreTaskCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async () => {
      await invalidateTasks();
    },
  });

  const duplicateTaskMutation = useMutation({
    mutationFn: (id: string) => duplicateTask(id),
    onSuccess: async () => {
      await invalidateTasks();
      toast.success("Task duplicated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startTimerMutation = useMutation({
    mutationFn: (task: TaskListItemDto) => startTaskTimer(task.id),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ["running-timer"] });
      const previous = queryClient.getQueryData<RunningTimer>([
        "running-timer",
      ]);
      queryClient.setQueryData<RunningTimer>(["running-timer"], {
        id: `temp-${Date.now()}`,
        taskId: task.id,
        taskName: task.name,
        taskNumber: task.taskNumber,
        startedAt: new Date().toISOString(),
      });
      return { previous };
    },
    onSuccess: () => toast.success("Timer started"),
    onError: (error: Error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(["running-timer"], context.previous ?? null);
      }
      toast.error(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["running-timer"] });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: () => stopTaskTimer(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["running-timer"] });
      const previous = queryClient.getQueryData<RunningTimer>([
        "running-timer",
      ]);
      queryClient.setQueryData<RunningTimer>(["running-timer"], null);
      return { previous };
    },
    onSuccess: () => toast.success("Timer stopped"),
    onError: (error: Error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(["running-timer"], context.previous ?? null);
      }
      toast.error(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["running-timer"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["task-time-entries"] });
    },
  });

  return {
    createTaskMutation,
    updateTaskMutation,
    completeTaskMutation,
    reorderTaskMutation,
    deleteTaskMutation,
    duplicateTaskMutation,
    startTimerMutation,
    stopTimerMutation,
  };
};

export const useTaskProjectMutations = () => {
  const queryClient = useQueryClient();
  const invalidateProjects = async () => {
    await queryClient.invalidateQueries({ queryKey: ["task-projects"] });
    await queryClient.invalidateQueries({ queryKey: ["task-lists"] });
  };

  const projectCaches = () =>
    queryClient.getQueriesData<TaskProjectDto[]>({
      queryKey: ["task-projects"],
    });

  const listCaches = () =>
    queryClient.getQueriesData<TaskListDto[]>({ queryKey: ["task-lists"] });

  const restoreCaches = (snapshots: TaskCacheSnapshot) => {
    for (const [key, data] of snapshots) {
      queryClient.setQueryData(key, data);
    }
  };

  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      createTaskProject(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["task-projects"] });
      const snapshots: TaskCacheSnapshot = [...projectCaches()];
      const now = new Date().toISOString();
      const tempProject: TaskProjectDto = {
        id: `temp-${Date.now()}`,
        name: data.name,
        color: data.color ?? null,
        sortOrder: 0,
        taskCounter: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      for (const [key, cache] of projectCaches()) {
        if (!cache) continue;
        const maxSort = cache.reduce(
          (max, project) => Math.max(max, project.sortOrder),
          0
        );
        queryClient.setQueryData<TaskProjectDto[]>(key, [
          ...cache,
          { ...tempProject, sortOrder: maxSort + 1 },
        ]);
      }
      return { snapshots };
    },
    onSuccess: () => toast.success("Project created"),
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async () => {
      await invalidateProjects();
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; color?: string | null; isArchived?: boolean };
    }) => updateTaskProject(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["task-projects"] });
      const snapshots: TaskCacheSnapshot = [...projectCaches()];
      for (const [key, cache] of projectCaches()) {
        if (!cache) continue;
        let next = cache.map((project) =>
          project.id === id ? { ...project, ...data } : project
        );
        const [, params] = key as [string, { includeArchived?: boolean }?];
        if (data.isArchived && !params?.includeArchived) {
          next = next.filter((project) => project.id !== id);
        }
        queryClient.setQueryData<TaskProjectDto[]>(key, next);
      }
      return { snapshots };
    },
    onSuccess: () => toast.success("Project updated"),
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async () => {
      await invalidateProjects();
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteTaskProject(id),
    onSuccess: async () => {
      await invalidateProjects();
      toast.success("Project deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createListMutation = useMutation({
    mutationFn: (data: { name: string; projectId: string }) =>
      createTaskList(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: ["task-lists", data.projectId],
      });
      const previous = queryClient.getQueryData<TaskListDto[]>([
        "task-lists",
        data.projectId,
      ]);
      if (previous) {
        const now = new Date().toISOString();
        queryClient.setQueryData<TaskListDto[]>(
          ["task-lists", data.projectId],
          [
            ...previous,
            {
              id: `temp-${Date.now()}`,
              name: data.name,
              sortOrder:
                previous.reduce(
                  (max, list) => Math.max(max, list.sortOrder),
                  0
                ) + 1,
              projectId: data.projectId,
              isArchived: false,
              createdAt: now,
              updatedAt: now,
            },
          ]
        );
      }
      return { previous, projectId: data.projectId };
    },
    onSuccess: () => toast.success("List created"),
    onError: (error: Error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["task-lists", variables.projectId],
          context.previous
        );
      }
      toast.error(error.message);
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["task-lists", variables.projectId],
      });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; isArchived?: boolean };
    }) => updateTaskList(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["task-lists"] });
      const snapshots: TaskCacheSnapshot = [...listCaches()];
      for (const [key, cache] of listCaches()) {
        if (!cache) continue;
        queryClient.setQueryData<TaskListDto[]>(
          key,
          cache.map((list) => (list.id === id ? { ...list, ...data } : list))
        );
      }
      return { snapshots };
    },
    onSuccess: () => toast.success("List updated"),
    onError: (error: Error, _variables, context) => {
      if (context?.snapshots) restoreCaches(context.snapshots);
      toast.error(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["task-lists"] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => deleteTaskList(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["task-lists"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("List deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    createListMutation,
    updateListMutation,
    deleteListMutation,
  };
};

export const useTaskDetailMutations = (taskId: string) => {
  const queryClient = useQueryClient();

  const invalidateDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    await queryClient.invalidateQueries({
      queryKey: ["task-activity", taskId],
    });
  };

  const patchDetail = (updater: (task: TaskDto) => TaskDto) => {
    const previous = queryClient.getQueryData<TaskDto>(["task", taskId]);
    if (previous) {
      queryClient.setQueryData<TaskDto>(["task", taskId], updater(previous));
    }
    return previous;
  };

  const restoreDetail = (previous?: TaskDto) => {
    if (previous) queryClient.setQueryData(["task", taskId], previous);
  };

  const patchComments = (
    updater: (comments: TaskCommentDto[]) => TaskCommentDto[]
  ) => {
    const previous = queryClient.getQueryData<TaskCommentDto[]>([
      "task-comments",
      taskId,
    ]);
    if (previous) {
      queryClient.setQueryData<TaskCommentDto[]>(
        ["task-comments", taskId],
        updater(previous)
      );
    }
    return previous;
  };

  const restoreComments = (previous?: TaskCommentDto[]) => {
    if (previous) {
      queryClient.setQueryData(["task-comments", taskId], previous);
    }
  };

  const setAssigneesMutation = useMutation({
    mutationFn: (memberIds: string[]) => setTaskAssignees(taskId, memberIds),
    onMutate: async (memberIds) => {
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      const options = queryClient.getQueryData<{ id: string; value: string }[]>(
        ["member-options"]
      );
      const previous = patchDetail((task) => {
        const existing = new Map(
          task.assignees.map((assignee) => [assignee.memberId, assignee])
        );
        return {
          ...task,
          assignees: memberIds.map(
            (memberId) =>
              existing.get(memberId) ?? {
                memberId,
                name:
                  options?.find((option) => option.id === memberId)?.value ??
                  "",
                image: null,
              }
          ),
        };
      });
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      restoreDetail(context?.previous);
      toast.error(error.message);
    },
    onSettled: invalidateDetail,
  });

  const setLabelsMutation = useMutation({
    mutationFn: (labelIds: string[]) => setTaskLabels(taskId, labelIds),
    onMutate: async (labelIds) => {
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      const allLabels = queryClient.getQueryData<TaskLabelDto[]>([
        "task-labels",
      ]);
      const previous = allLabels
        ? patchDetail((task) => ({
            ...task,
            labels: allLabels.filter((label) => labelIds.includes(label.id)),
          }))
        : undefined;
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      restoreDetail(context?.previous);
      toast.error(error.message);
    },
    onSettled: invalidateDetail,
  });

  const addChecklistItemMutation = useMutation({
    mutationFn: (title: string) => addChecklistItem(taskId, title),
    onSuccess: invalidateDetail,
    onError: (error: Error) => toast.error(error.message),
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: { title?: string; isDone?: boolean; sortOrder?: number };
    }) => updateChecklistItem(itemId, data),
    onMutate: async ({ itemId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      const previous = patchDetail((task) => {
        const checklistItems = task.checklistItems.map((item) =>
          item.id === itemId ? { ...item, ...data } : item
        );
        return {
          ...task,
          checklistItems,
          checklistDone: checklistItems.filter((item) => item.isDone).length,
        };
      });
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      restoreDetail(context?.previous);
      toast.error(error.message);
    },
    onSettled: invalidateDetail,
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: (itemId: string) => deleteChecklistItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      const previous = patchDetail((task) => {
        const checklistItems = task.checklistItems.filter(
          (item) => item.id !== itemId
        );
        return {
          ...task,
          checklistItems,
          checklistTotal: checklistItems.length,
          checklistDone: checklistItems.filter((item) => item.isDone).length,
        };
      });
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      restoreDetail(context?.previous);
      toast.error(error.message);
    },
    onSettled: invalidateDetail,
  });

  const addCommentMutation = useMutation({
    mutationFn: (body: string) => addTaskComment(taskId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["task-comments", taskId] });
      const session = queryClient.getQueryData<{
        user?: { name?: string; image?: string | null };
        member?: { id?: string };
      }>(["session"]);
      const memberId = session?.member?.id;
      const now = new Date().toISOString();
      const previous = memberId
        ? patchComments((comments) => [
            ...comments,
            {
              id: `temp-${Date.now()}`,
              body,
              memberId,
              author: {
                memberId,
                name: session?.user?.name ?? "",
                image: session?.user?.image ?? null,
              },
              createdAt: now,
              updatedAt: now,
            },
          ])
        : undefined;
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      restoreComments(context?.previous);
      toast.error(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["task-comments", taskId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["task-activity", taskId],
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      updateTaskComment(commentId, body),
    onMutate: async ({ commentId, body }) => {
      await queryClient.cancelQueries({ queryKey: ["task-comments", taskId] });
      const previous = patchComments((comments) =>
        comments.map((comment) =>
          comment.id === commentId ? { ...comment, body } : comment
        )
      );
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      restoreComments(context?.previous);
      toast.error(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["task-comments", taskId],
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ["task-comments", taskId] });
      const previous = patchComments((comments) =>
        comments.filter((comment) => comment.id !== commentId)
      );
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      restoreComments(context?.previous);
      toast.error(error.message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["task-comments", taskId],
      });
    },
  });

  const addAttachmentMutation = useMutation({
    mutationFn: (data: {
      url: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    }) => addTaskAttachment(taskId, data),
    onSuccess: invalidateDetail,
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteTaskAttachment(attachmentId),
    onSuccess: invalidateDetail,
    onError: (error: Error) => toast.error(error.message),
  });

  const addTimeEntryMutation = useMutation({
    mutationFn: (data: {
      durationMinutes: number;
      note?: string;
      startedAt?: string;
    }) => addTaskTimeEntry(taskId, data),
    onSuccess: async () => {
      await invalidateDetail();
      await queryClient.invalidateQueries({
        queryKey: ["task-time-entries", taskId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: (entryId: string) => deleteTaskTimeEntry(entryId),
    onSuccess: async () => {
      await invalidateDetail();
      await queryClient.invalidateQueries({
        queryKey: ["task-time-entries", taskId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startTimerMutation = useMutation({
    mutationFn: () => startTaskTimer(taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["running-timer"] });
      toast.success("Timer started");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stopTimerMutation = useMutation({
    mutationFn: () => stopTaskTimer(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["running-timer"] });
      await invalidateDetail();
      await queryClient.invalidateQueries({
        queryKey: ["task-time-entries", taskId],
      });
      toast.success("Timer stopped");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addDependencyMutation = useMutation({
    mutationFn: (blockerTaskId: string) =>
      addTaskDependency(taskId, blockerTaskId),
    onSuccess: invalidateDetail,
    onError: (error: Error) => toast.error(error.message),
  });

  const removeDependencyMutation = useMutation({
    mutationFn: (dependencyId: string) => removeTaskDependency(dependencyId),
    onSuccess: invalidateDetail,
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    setAssigneesMutation,
    setLabelsMutation,
    addChecklistItemMutation,
    updateChecklistItemMutation,
    deleteChecklistItemMutation,
    addCommentMutation,
    updateCommentMutation,
    deleteCommentMutation,
    addAttachmentMutation,
    deleteAttachmentMutation,
    addTimeEntryMutation,
    deleteTimeEntryMutation,
    startTimerMutation,
    stopTimerMutation,
    addDependencyMutation,
    removeDependencyMutation,
  };
};

export const useTaskLabelMutations = () => {
  const queryClient = useQueryClient();

  const createLabelMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      createTaskLabel(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["task-labels"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id: string) => deleteTaskLabel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["task-labels"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { createLabelMutation, deleteLabelMutation };
};
