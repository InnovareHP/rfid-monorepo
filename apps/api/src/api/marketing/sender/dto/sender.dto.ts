import { createZodDto } from "nestjs-zod";
import { CreateSenderSchema, UpdateSenderSchema } from "./sender.schema";

export class CreateSenderDto extends createZodDto(CreateSenderSchema) {}
export class UpdateSenderDto extends createZodDto(UpdateSenderSchema) {}
