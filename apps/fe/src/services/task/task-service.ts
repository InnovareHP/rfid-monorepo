import { axiosClient } from "@/lib/axios-client";
import type {
  CreateTaskPayload,
  PaginatedResponse,
  TaskActivityDto,
  TaskCommentDto,
  TaskDto,
  TaskLabelDto,
  TaskListDto,
  TaskListItemDto,
  TaskProjectDto,
  TaskReorderPayload,
  TaskStatusDto,
  TaskTimeEntryDto,
  UpdateTaskPayload,
} from "@dashboard/shared";

export type RunningTimer = {
  id: string;
  taskId: string;
  taskName: string;
  taskNumber: number;
  startedAt: string;
} | null;

export type TaskListQuery = {
  projectId: string;
  listId?: string;
  includeArchived?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

export const getTaskProjects = async (includeArchived?: boolean) => {
  const response = await axiosClient.get("/api/task/projects", {
    params: { includeArchived },
  });
  return response.data as TaskProjectDto[];
};

export const createTaskProject = async (data: {
  name: string;
  color?: string;
}) => {
  const response = await axiosClient.post("/api/task/projects", data);
  return response.data as TaskProjectDto & { defaultListId: string };
};

export const updateTaskProject = async (
  id: string,
  data: { name?: string; color?: string | null; isArchived?: boolean }
) => {
  const response = await axiosClient.patch(`/api/task/projects/${id}`, data);
  return response.data as TaskProjectDto;
};

export const deleteTaskProject = async (id: string) => {
  const response = await axiosClient.delete(`/api/task/projects/${id}`);
  return response.data;
};

export const getTaskLists = async (
  projectId: string,
  includeArchived?: boolean
) => {
  const response = await axiosClient.get("/api/task/lists", {
    params: { projectId, includeArchived },
  });
  return response.data as TaskListDto[];
};

export const createTaskList = async (data: {
  name: string;
  projectId: string;
}) => {
  const response = await axiosClient.post("/api/task/lists", data);
  return response.data as TaskListDto;
};

export const updateTaskList = async (
  id: string,
  data: { name?: string; isArchived?: boolean }
) => {
  const response = await axiosClient.patch(`/api/task/lists/${id}`, data);
  return response.data as TaskListDto;
};

export const deleteTaskList = async (id: string) => {
  const response = await axiosClient.delete(`/api/task/lists/${id}`);
  return response.data;
};

export const getTaskStatuses = async () => {
  const response = await axiosClient.get("/api/task/statuses");
  return response.data as TaskStatusDto[];
};

export const getTaskLabels = async () => {
  const response = await axiosClient.get("/api/task/labels");
  return response.data as TaskLabelDto[];
};

export const createTaskLabel = async (data: {
  name: string;
  color: string;
}) => {
  const response = await axiosClient.post("/api/task/labels", data);
  return response.data as TaskLabelDto;
};

export const deleteTaskLabel = async (id: string) => {
  const response = await axiosClient.delete(`/api/task/labels/${id}`);
  return response.data;
};

export const getTasks = async (query: TaskListQuery) => {
  const response = await axiosClient.get("/api/task", { params: query });
  return response.data as PaginatedResponse<TaskListItemDto>;
};

export const getTaskById = async (id: string) => {
  const response = await axiosClient.get(`/api/task/${id}`);
  return response.data as TaskDto;
};

export const createTask = async (data: CreateTaskPayload) => {
  const response = await axiosClient.post("/api/task", data);
  return response.data;
};

export const updateTask = async (id: string, data: UpdateTaskPayload) => {
  const response = await axiosClient.patch(`/api/task/${id}`, data);
  return response.data;
};

export const deleteTask = async (id: string) => {
  const response = await axiosClient.delete(`/api/task/${id}`);
  return response.data;
};

export const duplicateTask = async (id: string) => {
  const response = await axiosClient.post(`/api/task/${id}/duplicate`);
  return response.data;
};

export const completeTask = async (id: string) => {
  const response = await axiosClient.post(`/api/task/${id}/complete`);
  return response.data;
};

export const uncompleteTask = async (id: string) => {
  const response = await axiosClient.post(`/api/task/${id}/uncomplete`);
  return response.data;
};

export const reorderTask = async (data: TaskReorderPayload) => {
  const response = await axiosClient.patch("/api/task/reorder", data);
  return response.data;
};

export const setTaskAssignees = async (id: string, memberIds: string[]) => {
  const response = await axiosClient.put(`/api/task/${id}/assignees`, {
    memberIds,
  });
  return response.data;
};

export const setTaskLabels = async (id: string, labelIds: string[]) => {
  const response = await axiosClient.put(`/api/task/${id}/labels`, {
    labelIds,
  });
  return response.data;
};

export const addChecklistItem = async (taskId: string, title: string) => {
  const response = await axiosClient.post(`/api/task/${taskId}/checklist`, {
    title,
  });
  return response.data;
};

export const updateChecklistItem = async (
  itemId: string,
  data: { title?: string; isDone?: boolean; sortOrder?: number }
) => {
  const response = await axiosClient.patch(
    `/api/task/checklist/${itemId}`,
    data
  );
  return response.data;
};

export const deleteChecklistItem = async (itemId: string) => {
  const response = await axiosClient.delete(`/api/task/checklist/${itemId}`);
  return response.data;
};

export const getTaskComments = async (taskId: string) => {
  const response = await axiosClient.get(`/api/task/${taskId}/comments`);
  return response.data as TaskCommentDto[];
};

export const addTaskComment = async (taskId: string, body: string) => {
  const response = await axiosClient.post(`/api/task/${taskId}/comments`, {
    body,
  });
  return response.data;
};

export const updateTaskComment = async (commentId: string, body: string) => {
  const response = await axiosClient.patch(`/api/task/comments/${commentId}`, {
    body,
  });
  return response.data;
};

export const deleteTaskComment = async (commentId: string) => {
  const response = await axiosClient.delete(`/api/task/comments/${commentId}`);
  return response.data;
};

export const addTaskAttachment = async (
  taskId: string,
  data: { url: string; filename: string; mimeType: string; sizeBytes: number }
) => {
  const response = await axiosClient.post(
    `/api/task/${taskId}/attachments`,
    data
  );
  return response.data;
};

export const deleteTaskAttachment = async (attachmentId: string) => {
  const response = await axiosClient.delete(
    `/api/task/attachments/${attachmentId}`
  );
  return response.data;
};

export const getTaskTimeEntries = async (taskId: string) => {
  const response = await axiosClient.get(`/api/task/${taskId}/time-entries`);
  return response.data as TaskTimeEntryDto[];
};

export const addTaskTimeEntry = async (
  taskId: string,
  data: { durationMinutes: number; note?: string; startedAt?: string }
) => {
  const response = await axiosClient.post(
    `/api/task/${taskId}/time-entries`,
    data
  );
  return response.data;
};

export const deleteTaskTimeEntry = async (entryId: string) => {
  const response = await axiosClient.delete(
    `/api/task/time-entries/${entryId}`
  );
  return response.data;
};

export const startTaskTimer = async (taskId: string) => {
  const response = await axiosClient.post("/api/task/timer/start", { taskId });
  return response.data;
};

export const stopTaskTimer = async () => {
  const response = await axiosClient.post("/api/task/timer/stop");
  return response.data;
};

export const getRunningTimer = async () => {
  const response = await axiosClient.get("/api/task/timer/running");
  return (response.data ?? null) as RunningTimer;
};

export const addTaskDependency = async (
  taskId: string,
  blockerTaskId: string
) => {
  const response = await axiosClient.post(`/api/task/${taskId}/dependencies`, {
    blockerTaskId,
  });
  return response.data;
};

export const removeTaskDependency = async (dependencyId: string) => {
  const response = await axiosClient.delete(
    `/api/task/dependencies/${dependencyId}`
  );
  return response.data;
};

export const getTaskActivity = async (taskId: string) => {
  const response = await axiosClient.get(`/api/task/${taskId}/activity`);
  return response.data as TaskActivityDto[];
};
