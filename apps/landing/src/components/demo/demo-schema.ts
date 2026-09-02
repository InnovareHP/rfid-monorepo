import { z } from "zod";

// Mirrors CreateDemoRequestSchema in the API, so the form never sends
// something the route will reject. Messages are the client's own.
export const demoRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell us your name")
    .max(120, "That name is too long"),
  // z.email covers empty and malformed with one message; the API uses the
  // same top-level validator.
  email: z
    .email("Enter a work email so we can send the invite")
    .trim()
    .max(254, "That email is too long"),
  company: z.string().trim().max(160, "That name is too long").optional(),
  phone: z
    .string()
    .trim()
    .max(40, "That number is too long")
    // Digits and the usual separators: anything else is a typo, not a number.
    .regex(/^[\d\s()+.-]*$/, "Digits, spaces and + ( ) - . only")
    .optional(),
  teamSize: z.string().trim().max(40).optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Keep it under 2000 characters")
    .optional(),
  website: z.string().max(200).optional(),
});

export type DemoRequestValues = z.infer<typeof demoRequestSchema>;

export type DemoFieldErrors = Partial<
  Record<keyof DemoRequestValues, string>
>;

// One message per field, first one wins, which is all the form shows.
export const firstErrors = (
  error: z.ZodError<DemoRequestValues>
): DemoFieldErrors =>
  error.issues.reduce<DemoFieldErrors>((acc, issue) => {
    const key = issue.path[0] as keyof DemoRequestValues;
    if (key && !acc[key]) acc[key] = issue.message;
    return acc;
  }, {});
