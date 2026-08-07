import { CampaignStatus } from "@prisma/client";
import { z } from "zod";

export const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  senderIdentityId: z.string().nullable().optional(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  status: z.enum(CampaignStatus).optional(),
});
