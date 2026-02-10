import z from "zod";

export const OnboardingSchema = z.object({
  foundUsOn: z.string(),
  purpose: z.string(),
  interests: z.array(z.string()),
});

export type OnboardingData = z.infer<typeof OnboardingSchema>;
