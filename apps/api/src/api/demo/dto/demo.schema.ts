import { createZodDto } from "nestjs-zod";
import {
  BookDemoSchema,
  CreateDemoRequestSchema,
  ListDemoRequestsQuerySchema,
  SetDemoHostSchema,
  UpdateDemoRequestSchema,
} from "./demo.dto";

export class CreateDemoRequestDto extends createZodDto(
  CreateDemoRequestSchema
) {}
export class BookDemoDto extends createZodDto(BookDemoSchema) {}
export class ListDemoRequestsQueryDto extends createZodDto(
  ListDemoRequestsQuerySchema
) {}
export class UpdateDemoRequestDto extends createZodDto(
  UpdateDemoRequestSchema
) {}
export class SetDemoHostDto extends createZodDto(SetDemoHostSchema) {}
