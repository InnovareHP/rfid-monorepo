import { z } from "zod";

export const UploadImageSchema = z.object({
  file: z.instanceof(File),
});

// Cloudinary public ids contain the folder path, so they travel as a query value.
export const DeleteImageSchema = z.object({
  publicId: z.string().min(1),
});
