import { createZodDto } from "nestjs-zod";
import { SendEmailSchema } from "./email.dto";

export class SendEmailDto extends createZodDto(SendEmailSchema) {}
