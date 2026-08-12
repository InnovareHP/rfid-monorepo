import { createZodDto } from "nestjs-zod";
import {
  CreateBlastSchema,
  SendBlastSchema,
  TestSendBlastSchema,
  UpdateBlastSchema,
} from "./blast.schema";

export class CreateBlastDto extends createZodDto(CreateBlastSchema) {}
export class UpdateBlastDto extends createZodDto(UpdateBlastSchema) {}
export class SendBlastDto extends createZodDto(SendBlastSchema) {}
export class TestSendBlastDto extends createZodDto(TestSendBlastSchema) {}
