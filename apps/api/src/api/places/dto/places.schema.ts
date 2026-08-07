import { createZodDto } from "nestjs-zod";
import {
  AutocompleteQuerySchema,
  CountyCenterQuerySchema,
  PlaceDetailsQuerySchema,
} from "./places.dto";

export class AutocompleteQueryDto extends createZodDto(
  AutocompleteQuerySchema
) {}

export class PlaceDetailsQueryDto extends createZodDto(
  PlaceDetailsQuerySchema
) {}

export class CountyCenterQueryDto extends createZodDto(
  CountyCenterQuerySchema
) {}
