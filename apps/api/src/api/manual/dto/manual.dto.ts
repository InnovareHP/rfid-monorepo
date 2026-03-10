import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const ManualStepSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1),
  imageUrl: z.string().optional(),
  order: z.number().int().default(0),
});

export const CreateArticleSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().min(1),
  categoryId: z.string().uuid(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
  steps: z.array(ManualStepSchema).min(1),
});

export const UpdateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
  steps: z.array(ManualStepSchema).min(1).optional(),
});
