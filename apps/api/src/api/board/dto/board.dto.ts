import { BoardFieldType } from "@prisma/client";
import { z } from "zod";

export const CreateRecordSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
  record_name: z.string(),
  moduleType: z.string(),
});

export const UpdateRecordValueSchema = z.object({
  value: z.string(),
  field_id: z.string(),
  moduleType: z.string().default("LEAD"),
  reason: z.string().optional(),
});

export const RestoreHistorySchema = z.object({
  record_id: z.string(),
  history_id: z.string(),
  event_type: z.string(),
});

export const NotificationStateSchema = z.object({
  record_id: z.string(),
});

export const CsvImportSchema = z.object({
  excelData: z.array(z.record(z.string(), z.unknown())),
  moduleType: z.string(),
});

export const CreateColumnSchema = z.object({
  column_name: z.string(),
  field_type: z.enum(BoardFieldType),
  module_type: z.string(),
});

export const CreateLocationSchema = z.object({
  location_name: z.string(),
  lead_id: z.string(),
});

export const CreateFieldOptionSchema = z.object({
  option_name: z.string(),
});

export const CreateHistorySchema = z.object({
  old_value: z.string(),
  new_value: z.string(),
  created_by: z.string(),
});

export const DeleteRecordsSchema = z.object({
  column_ids: z.array(z.string()),
});

export const CreateRecordCountyAssignmentSchema = z.object({
  name: z.string(),
  assigned_to: z.string(),
});

export const CreateActivitySchema = z.object({
  record_id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  activity_type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]),
  due_date: z.string().optional(),
  recipient_email: z.string().email().optional(),
  email_subject: z.string().optional(),
  email_body: z.string().optional(),
  send_via: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});

export const UpdateActivitySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
  due_date: z.string().optional(),
  recipient_email: z.string().email().optional(),
  email_subject: z.string().optional(),
  email_body: z.string().optional(),
});

export const CompleteActivitySchema = z.object({
  email_body: z.string().optional(),
  email_subject: z.string().optional(),
  recipient_email: z.string().email().optional(),
  send_via: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});

export const BulkEmailSchema = z.object({
  record_ids: z.array(z.string()).min(1).max(50),
  email_subject: z.string().min(1),
  email_body: z.string().min(1),
  send_via: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});
