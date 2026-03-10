import { createZodDto } from "nestjs-zod";
import {
  CreateArticleSchema,
  CreateCategorySchema,
  UpdateArticleSchema,
  UpdateCategorySchema,
} from "./manual.dto";

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
export class CreateArticleDto extends createZodDto(CreateArticleSchema) {}
export class UpdateArticleDto extends createZodDto(UpdateArticleSchema) {}
