import { createZodDto } from "nestjs-zod";
import { CreateCampaignSchema, UpdateCampaignSchema } from "./campaign.schema";

export class CreateCampaignDto extends createZodDto(CreateCampaignSchema) {}
export class UpdateCampaignDto extends createZodDto(UpdateCampaignSchema) {}
