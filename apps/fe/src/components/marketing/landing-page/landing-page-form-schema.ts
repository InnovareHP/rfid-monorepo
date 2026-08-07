import { z } from "zod";

// Local FE mirror of the backend section schemas — never import the API's
// Zod module across the API/FE boundary (same precedent as public-form-page).
const optionalUrl = z
  .string()
  .optional()
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Must be a valid http(s) URL",
  });

const requiredUrl = z
  .string()
  .min(1, "URL is required")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Must be a valid http(s) URL",
  });

const sectionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("HERO"),
    props: z.object({
      heading: z.string().min(1, "Heading is required").max(200),
      subheading: z.string().max(500).optional(),
      imageSrc: optionalUrl,
      ctaLabel: z.string().max(100).optional(),
      ctaHref: optionalUrl,
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("TEXT"),
    props: z.object({
      heading: z.string().max(200).optional(),
      body: z.string().min(1, "Body is required").max(5000),
      ctaLabel: z.string().max(100).optional(),
      ctaHref: optionalUrl,
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("IMAGE"),
    props: z.object({
      src: requiredUrl,
      alt: z.string().max(200),
      caption: z.string().max(300).optional(),
      ctaLabel: z.string().max(100).optional(),
      ctaHref: optionalUrl,
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("FORM_EMBED"),
    props: z.object({ heading: z.string().max(200).optional() }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("CTA"),
    props: z.object({
      heading: z.string().max(200).optional(),
      buttonLabel: z.string().min(1, "Button label is required").max(100),
      href: requiredUrl,
    }),
  }),
]);

export const landingPageFormSchema = z.object({
  name: z.string().min(1, "Page name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers and single hyphens only"
    ),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  formId: z.string().nullable(),
  sections: z.array(sectionSchema).max(20),
});

export type LandingPageFormValues = z.infer<typeof landingPageFormSchema>;
