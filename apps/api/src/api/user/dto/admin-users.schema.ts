import { createZodDto } from "nestjs-zod";
import z from "zod";

export const AdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  roleFilter: z.string().optional(),
});

export class AdminUsersQueryDto extends createZodDto(AdminUsersQuerySchema) {}
