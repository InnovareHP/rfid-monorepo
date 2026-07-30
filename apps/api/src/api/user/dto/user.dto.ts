import z from "zod";

export const OnboardingSchema = z.object({
  foundUsOn: z.string(),
  organizationName: z.string(),
  brandColor: z.string(),
  logo: z.string().optional(),
});

export type OnboardingData = z.infer<typeof OnboardingSchema>;
