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

export const CreateMarketingSchema = z.object({
  facility: z.string(),
  touchpoint: z.array(z.enum(TouchpointType)),
  talkedTo: z.string(),
  notes: z.string().optional(),
  reasonForVisit: z.string().optional(),
});

export const UpdateMarketingSchema = z.object({
  facility: z.string().optional(),
  touchpoint: z.enum(TouchpointType).optional(),
  talkedTo: z.string().optional(),
  notes: z.string().optional(),
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
