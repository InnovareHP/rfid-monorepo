import { createZodDto } from "nestjs-zod";
import {
  CreateFormSchema,
  PublicFormSubmitSchema,
  UpdateFormSchema,
} from "./form.schema";

export class CreateFormDto extends createZodDto(CreateFormSchema) {}
export class UpdateFormDto extends createZodDto(UpdateFormSchema) {}
export class PublicFormSubmitDto extends createZodDto(PublicFormSubmitSchema) {}
