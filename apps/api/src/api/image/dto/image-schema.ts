import { createZodDto } from "nestjs-zod";
import {
  DeleteImageSchema,
  UploadImageQuerySchema,
  ViewImageQuerySchema,
} from "./image.dto";

export class UploadImageQueryDto extends createZodDto(UploadImageQuerySchema) {}
export class DeleteImageDto extends createZodDto(DeleteImageSchema) {}
export class ViewImageQueryDto extends createZodDto(ViewImageQuerySchema) {}
