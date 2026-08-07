import { z } from "zod";

export const AutocompleteQuerySchema = z.object({
  input: z.string().min(1, "input is required"),
});

export const PlaceDetailsQuerySchema = z.object({
  placeId: z.string().min(1, "placeId is required"),
});

export const CountyCenterQuerySchema = z.object({
  county: z.string().min(1, "county is required"),
});
