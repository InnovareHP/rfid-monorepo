import { BoardFieldType } from "@prisma/client";
import { z } from "zod";

export const CreateRecordSchema = z
  .object({
    data: z.array(z.record(z.string(), z.unknown())).optional(),
    recordName: z.string().optional(),
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
  })
  .superRefine((value, ctx) => {
    if (!value.data?.length && !value.recordName) {
      ctx.addIssue({
        code: "custom",
        message: "Either data rows or a recordName is required",
        path: ["recordName"],
      });
    }
  });

export const UpdateRecordValueSchema = z.object({
  value: z.string(),
  fieldId: z.string(),
  moduleType: z.string().default("LEAD"),
  reason: z.string().optional(),
  previousValue: z.string().optional(),
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

// Columns the user chose to create rather than map. Only types the import can
// actually populate are accepted; TIMELINE, LOCATION, ASSIGNED_TO, PERSON and
// the *_LINK types need a resolution step a spreadsheet cell cannot supply.
// Exported so the service can re-validate: this controller has no
// ZodValidationPipe, so a request body reaches it unchecked.
export const CsvNewColumnsSchema = z.array(
  z.object({
    header: z.string().min(1),
    fieldName: z.string().trim().min(1).max(120),
    fieldType: z.enum([
      BoardFieldType.TEXT,
      BoardFieldType.NUMBER,
      BoardFieldType.DATE,
      BoardFieldType.EMAIL,
      BoardFieldType.PHONE,
      BoardFieldType.CHECKBOX,
      BoardFieldType.DROPDOWN,
      BoardFieldType.MULTISELECT,
    ]),
  })
);

export const CsvImportSchema = z.object({
  excelData: z.array(z.record(z.string(), z.unknown())).min(1).max(20_000),
  moduleType: z.string(),
  // CSV header -> Field id, chosen by the user in the import mapping step. A
  // header the user left unmapped is absent here and is never guessed at.
  columnMap: z.record(z.string(), z.string().min(1)),
  // Board.recordName is not a Field, so the naming column is picked explicitly.
  nameColumn: z.string().min(1),
  newColumns: CsvNewColumnsSchema.default([]),
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
  moduleType: z.string().optional(),
});

export const RecordLinkCountsSchema = z.object({
  recordIds: z.array(z.string()).min(1),
});

export const CreateActivitySchema = z.object({
  recordId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  // FAX is absent on purpose: a fax activity carries a number and goes through
  // CreateFaxActivitySchema instead.
  activityType: z.enum([
    "CALL",
    "EMAIL",
    "MEETING",
    "NOTE",
    "TEXT",
    "LINKED_IN",
    "FACEBOOK",
    "OTHER",
  ]),
  dueDate: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  send_via: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});

export const CreateFaxActivitySchema = z.object({
  recordId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  faxNumber: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Fax number must be E.164, e.g. +15551234567"),
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

export const CreateRecordAttachmentSchema = z.object({
  fieldId: z.string(),
  moduleType: z.string().default("LEAD"),
});
