import { BoardFieldType } from "@prisma/client";
import { z } from "zod";

export const CreateRecordSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
  recordName: z.string(),
  moduleType: z.string(),
  initialValues: z.record(z.string(), z.string().nullable()).optional(),
  personContact: z
    .object({
      fieldId: z.string(),
      contactNumber: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

export const UpdateRecordValueSchema = z.object({
  value: z.string(),
  fieldId: z.string(),
  moduleType: z.string().default("LEAD"),
  reason: z.string().optional(),
});

export const RestoreHistorySchema = z.object({
  recordId: z.string(),
  history_id: z.string(),
  event_type: z.string(),
  moduleType: z.string().default("LEAD"),
});

export const NotificationStateSchema = z.object({
  recordId: z.string(),
});

export const CsvImportSchema = z.object({
  excelData: z.array(z.record(z.string(), z.unknown())),
  moduleType: z.string(),
});

export const CreateColumnSchema = z.object({
  column_name: z.string(),
  fieldType: z.enum(BoardFieldType),
  moduleType: z.string(),
});

export const CreateLocationSchema = z.object({
  location_name: z.string(),
  lead_id: z.string(),
});

export const CreateFieldOptionSchema = z.object({
  optionName: z.string(),
  color: z.string().optional(),
});

export const CreateHistorySchema = z.object({
  oldValue: z.string(),
  newValue: z.string(),
  createdBy: z.string(),
});

export const DeleteRecordsSchema = z.object({
  column_ids: z.array(z.string()),
});

export const CreateRecordCountyAssignmentSchema = z.object({
  name: z.string(),
  assignedTo: z.string(),
});

export const CreateActivitySchema = z.object({
  recordId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  activityType: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]),
  dueDate: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  send_via: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});

export const UpdateActivitySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
  dueDate: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
});

export const CompleteActivitySchema = z.object({
  emailBody: z.string().optional(),
  emailSubject: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  send_via: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});

export const BulkEmailSchema = z.object({
  recordIds: z.array(z.string()).min(1).max(50),
  emailSubject: z.string().min(1),
  emailBody: z.string().min(1),
  send_via: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});

export const UpdateContactSchema = z.object({
  contactNumber: z.string().min(1, "Phone is required"),
  email: z.email("Invalid email address").or(z.literal("")),
  address: z.string(),
  value: z.string(),
});
