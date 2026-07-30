import { createZodDto } from "nestjs-zod";
import {
  CreateLandingPageSchema,
  UpdateLandingPageSchema,
} from "./landing-page.schema";

export class CreateLandingPageDto extends createZodDto(
  CreateLandingPageSchema
) {}
export class UpdateLandingPageDto extends createZodDto(
  UpdateLandingPageSchema
) {}
