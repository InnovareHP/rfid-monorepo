import { TaskPriority } from "@prisma/client";
import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const CreateListSchema = z.object({
  name: z.string().min(1),
  projectId: z.string(),
});

export const UpdateListSchema = z.object({
  name: z.string().min(1).optional(),
  isArchived: z.boolean().optional(),
});

export const CreateLabelSchema = z.object({
  name: z.string().min(1),
  color: z.string(),
});

export const UpdateLabelSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

export const CreateTaskSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string(),
  listId: z.string(),
  statusId: z.string().optional(),
  priority: z.enum(TaskPriority).optional(),
  parentTaskId: z.string().optional(),
  startDate: z.iso.datetime().nullable().optional(),
  dueDate: z.iso.datetime().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  assigneeMemberIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
});

export const UpdateTaskSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  statusId: z.string().optional(),
  priority: z.enum(TaskPriority).optional(),
  startDate: z.iso.datetime().nullable().optional(),
  dueDate: z.iso.datetime().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const ReorderTaskSchema = z.object({
  taskId: z.string(),
  listId: z.string(),
  beforeTaskId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
});

export const SetMembersSchema = z.object({
  memberIds: z.array(z.string()),
});

export const SetLabelsSchema = z.object({
  labelIds: z.array(z.string()),
});

export const CreateChecklistItemSchema = z.object({
  title: z.string().min(1),
});

export const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1).optional(),
  isDone: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const CreateCommentSchema = z.object({
  body: z.string().min(1),
});

export const UpdateCommentSchema = z.object({
  body: z.string().min(1),
});

export const CreateAttachmentSchema = z.object({
  url: z.url(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const CreateTimeEntrySchema = z.object({
  durationMinutes: z.number().int().positive(),
  note: z.string().optional(),
  startedAt: z.iso.datetime().optional(),
});

export const StartTimerSchema = z.object({
  taskId: z.string(),
});

export const CreateDependencySchema = z.object({
  blockerTaskId: z.string(),
});
