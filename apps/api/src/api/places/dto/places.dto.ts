import { z } from "zod";

export const AutocompleteQuerySchema = z.object({
  input: z.string().min(1, "input is required"),
  sessionToken: z.string().uuid().optional(),
});

export const PlaceDetailsQuerySchema = z.object({
  placeId: z.string().min(1, "placeId is required"),
  sessionToken: z.string().uuid().optional(),
});
