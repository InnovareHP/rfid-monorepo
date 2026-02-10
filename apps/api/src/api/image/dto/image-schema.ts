import { createZodDto } from "nestjs-zod";
import { DeleteImageSchema, UploadImageSchema } from "./image.dto";

export class UploadImageDto extends createZodDto(UploadImageSchema) {}
export class DeleteImageDto extends createZodDto(DeleteImageSchema) {}
