import { MARKETING_IMPORT_BATCH_SIZE } from "@dashboard/shared";
import { MileageRateType, TouchpointType } from "@prisma/client";
import { z } from "zod";

export const CreateMillageSchema = z.object({
  destination: z.string(),
  countiesMarketed: z.string(),
  beginningMileage: z.number(),
  endingMileage: z.number(),
  totalMiles: z.number(),
  rateType: z.enum(MileageRateType),
  ratePerMile: z.number(),
  reimbursementAmount: z.number(),
});

export const UpdateMillageSchema = z.object({
  destination: z.string().optional(),
  countiesMarketed: z.string().optional(),
  beginningMileage: z.number().optional(),
  endingMileage: z.number().optional(),
  totalMiles: z.number().optional(),
  rateType: z.enum(MileageRateType).optional(),
  ratePerMile: z.number().optional(),
  reimbursementAmount: z.number().optional(),
});

// EMAIL_BLAST is a server-only touchpoint set by the bulk-email mirror path, never by manual entry.
const ManualTouchpointType = z.enum(TouchpointType).exclude(["EMAIL_BLAST"]);

export const CreateMarketingSchema = z.object({
  facility: z.string(),
  touchpoint: z.array(ManualTouchpointType).min(1),
  talkedTo: z.string(),
  notes: z.string().optional(),
  reasonForVisit: z.string().optional(),
});

export const UpdateMarketingSchema = z.object({
  facility: z.string().optional(),
  touchpoint: z.array(ManualTouchpointType).min(1).optional(),
  talkedTo: z.string().optional(),
  notes: z.string().optional(),
  reasonForVisit: z.string().optional(),
});

export const CreateExpenseSchema = z.object({
  amount: z.number(),
  description: z.string(),
  notes: z.string(),
  image: z.url(),
});

export const UpdateExpenseSchema = z.object({
  amount: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const BulkDeleteLogSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

const ImportBatch = <T extends z.ZodTypeAny>(row: T) =>
  z.object({
    dryRun: z.boolean(),
    // Position of the batch's first row in the whole file, for row numbers and same-day ordering.
    firstRow: z.number().int().min(0),
    rows: z.array(row).min(1).max(MARKETING_IMPORT_BATCH_SIZE),
  });

export const ImportMarketingSchema = ImportBatch(
  z.object({
    date: z.iso
      .date()
      .refine(
        (date) => date >= "2000-01-01" && date <= "2100-12-31",
        "Date is out of range"
      ),
    facility: z.string().trim().min(1).max(300),
    talkedTo: z.string().trim().max(300),
    touchpoints: z.array(ManualTouchpointType).min(1),
    notes: z.string().max(5000).optional(),
  })
);

export const ImportAccountManagersSchema = ImportBatch(
  z.object({
    facility: z.string().trim().min(1).max(300),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  })
);

export const UndoMarketingImportSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(MARKETING_IMPORT_BATCH_SIZE),
});
