export const TASK_PRIORITY = {
  URGENT: "URGENT",
  HIGH: "HIGH",
  NORMAL: "NORMAL",
  LOW: "LOW",
} as const;

export type TaskPriorityValue =
  (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const TASK_STATUS_CATEGORY = {
  ACTIVE: "ACTIVE",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;

export type TaskStatusCategoryValue =
  (typeof TASK_STATUS_CATEGORY)[keyof typeof TASK_STATUS_CATEGORY];

export type TaskProjectDto = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  taskCounter: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskListDto = {
  id: string;
  name: string;
  sortOrder: number;
  projectId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatusDto = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  category: TaskStatusCategoryValue;
};

export type TaskLabelDto = {
  id: string;
  name: string;
  color: string;
};

export type TaskMemberDto = {
  memberId: string;
  name: string;
  image: string | null;
};

export type TaskChecklistItemDto = {
  id: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
};

export type TaskCommentDto = {
  id: string;
  body: string;
  memberId: string;
  author: TaskMemberDto;
  createdAt: string;
  updatedAt: string;
};

export type TaskAttachmentDto = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
};

export type TaskTimeEntryDto = {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  note: string | null;
};

export type TaskActivityDto = {
  id: string;
  field: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  actorUserId: string;
  actorName: string | null;
  createdAt: string;
};

export type TaskDependencyDto = {
  id: string;
  blockerTaskId: string;
  blockedTaskId: string;
  blockerTaskName: string | null;
  blockedTaskName: string | null;
  blockerTaskNumber: number | null;
  blockedTaskNumber: number | null;
};

export type TaskListItemDto = {
  id: string;
  taskNumber: number;
  name: string;
  priority: TaskPriorityValue;
  statusId: string;
  status: TaskStatusDto;
  projectId: string;
  listId: string;
  parentTaskId: string | null;
  startDate: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  trackedMinutes: number;
  position: number;
  completedAt: string | null;
  isArchived: boolean;
  labels: TaskLabelDto[];
  assignees: TaskMemberDto[];
  checklistDone: number;
  checklistTotal: number;
  subtaskCount: number;
  blockedByCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskDto = TaskListItemDto & {
  description: string | null;
  createdBy: string;
  creatorName: string | null;
  watchers: TaskMemberDto[];
  checklistItems: TaskChecklistItemDto[];
  attachments: TaskAttachmentDto[];
  subtasks: TaskListItemDto[];
  blockedBy: TaskDependencyDto[];
  blocking: TaskDependencyDto[];
};

export type TaskReorderPayload = {
  taskId: string;
  listId: string;
  beforeTaskId?: string | null;
  projectId?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  nextPage: number | null;
};

export type CreateTaskPayload = {
  name: string;
  description?: string;
  projectId: string;
  listId: string;
  statusId?: string;
  priority?: TaskPriorityValue;
  parentTaskId?: string;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  assigneeMemberIds?: string[];
  labelIds?: string[];
};

export type UpdateTaskPayload = {
  name?: string;
  description?: string | null;
  statusId?: string;
  priority?: TaskPriorityValue;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  isArchived?: boolean;
};
