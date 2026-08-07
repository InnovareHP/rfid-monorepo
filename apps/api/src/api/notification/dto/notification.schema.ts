import { createZodDto } from "nestjs-zod";
import { MarkReadSchema } from "./notification.dto";

export class MarkReadDto extends createZodDto(MarkReadSchema) {}
