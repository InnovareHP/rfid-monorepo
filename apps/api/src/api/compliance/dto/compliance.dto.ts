import { BAA_ENTITY_TYPES } from "@dashboard/shared";
import { z } from "zod";

// Roughly 700KB of PNG once decoded, well above a drawn signature and well
// under the 1mb parser the sign route mounts.
const SIGNATURE_MAX = 950_000;

export const UpdateComplianceSettingsSchema = z.object({
  hipaaEnabled: z.boolean().optional(),
  retentionDays: z.number().int().min(365).max(3650).optional(),
  ipAllowlist: z.array(z.string().trim().min(1)).max(50).optional(),
});

export const SignBaaSchema = z.object({
  companyLegalName: z.string().trim().min(2).max(200),
  companyJurisdiction: z.string().trim().min(2).max(100),
  companyEntityType: z
    .enum(BAA_ENTITY_TYPES)
    .or(z.string().trim().min(2).max(100)),
  companyAddress: z.string().trim().min(5).max(300),
  signerName: z.string().trim().min(2).max(150),
  signerTitle: z.string().trim().min(2).max(150),
  acknowledged: z.literal(true),
  signature: z.string().startsWith("data:image/png;base64,").max(SIGNATURE_MAX),
});

export type UpdateComplianceSettingsInput = z.infer<
  typeof UpdateComplianceSettingsSchema
>;
export type SignBaaInput = z.infer<typeof SignBaaSchema>;
