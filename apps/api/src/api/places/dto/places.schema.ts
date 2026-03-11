import { createZodDto } from "nestjs-zod";
import {
  AutocompleteQuerySchema,
  PlaceDetailsQuerySchema,
} from "./places.dto";

export class AutocompleteQueryDto extends createZodDto(
  AutocompleteQuerySchema
) {}

export class PlaceDetailsQueryDto extends createZodDto(
  PlaceDetailsQuerySchema
) {}
