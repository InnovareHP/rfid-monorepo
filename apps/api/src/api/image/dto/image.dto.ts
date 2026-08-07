import { z } from "zod";

// Public objects are readable by URL, so callers opt in only for logos and marketing images.
export const ImageVisibilitySchema = z
  .enum(["public", "private"])
  .default("private");

export type ImageVisibility = z.infer<typeof ImageVisibilitySchema>;

export const UploadImageQuerySchema = z.object({
  visibility: ImageVisibilitySchema,
});

// S3 keys carry the visibility and scope prefix, so they travel as a query value.
export const DeleteImageSchema = z.object({
  publicId: z.string().min(1),
});

export const ViewImageQuerySchema = z.object({
  key: z.string().min(1),
});
