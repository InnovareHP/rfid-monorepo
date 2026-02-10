import { FieldType } from "@prisma/client";
import { z } from "zod";

export const CreateRecordSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
  record_name: z.string(),
  moduleType: z.string(),
});

export const UpdateRecordValueSchema = z.object({
  value: z.string(),
  field_id: z.string(),
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
  field_type: z.enum(FieldType),
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
