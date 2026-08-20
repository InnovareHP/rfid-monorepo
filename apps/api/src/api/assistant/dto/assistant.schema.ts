import { createZodDto } from "nestjs-zod";
import { AskAssistantSchema } from "./assistant.dto";

export class AskAssistantDto extends createZodDto(AskAssistantSchema) {}
