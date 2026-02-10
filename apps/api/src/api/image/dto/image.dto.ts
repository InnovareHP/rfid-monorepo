import { z } from "zod";

export const UploadImageSchema = z.object({
  file: z.instanceof(File),
});

export const DeleteImageSchema = z.object({
  id: z.string(),
});
