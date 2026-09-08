import { z } from "zod";

// A sidebar folder, not a scope: the name is the only thing an organization
// picks, and it has to stay short enough to read in the nav.
const name = z.string().trim().min(1).max(40);

export const CreateModuleGroupSchema = z.object({ name });

export const UpdateModuleGroupSchema = z.object({ name });

export const ReorderModuleGroupsSchema = z.object({
  groupIds: z.array(z.uuid()).min(1).max(50),
});
