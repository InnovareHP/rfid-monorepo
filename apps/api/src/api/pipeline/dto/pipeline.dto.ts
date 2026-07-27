import { StageType } from "@prisma/client";
import { z } from "zod";

export const SetPipelineConfigSchema = z.object({
  moduleType: z.string(),
  stageFieldId: z.string(),
  amountFieldId: z.string().nullable().optional(),
});

export const UpdatePipelineStagesSchema = z.object({
  moduleType: z.string(),
  stages: z
    .array(
      z.object({
        optionId: z.string(),
        optionOrder: z.number().int().min(0),
        stageType: z.enum(StageType),
        probability: z.number().int().min(0).max(100).nullable().optional(),
      })
    )
    .min(1),
});
