import { z } from "zod";

const SectionBase = z.object({ id: z.string().min(1) });

const HeroSectionSchema = SectionBase.extend({
  type: z.literal("HERO"),
  props: z.object({
    heading: z.string().min(1).max(200),
    subheading: z.string().max(500).optional(),
    imageSrc: z.url({ protocol: /^https?$/ }).optional(),
    ctaLabel: z.string().max(100).optional(),
    ctaHref: z.url({ protocol: /^https?$/ }).optional(),
  }),
});

const TextSectionSchema = SectionBase.extend({
  type: z.literal("TEXT"),
  props: z.object({
    heading: z.string().max(200).optional(),
    body: z.string().min(1).max(5000),
  }),
});

const ImageSectionSchema = SectionBase.extend({
  type: z.literal("IMAGE"),
  props: z.object({
    src: z.url({ protocol: /^https?$/ }),
    alt: z.string().max(200).default(""),
    caption: z.string().max(300).optional(),
  }),
});

const FormEmbedSectionSchema = SectionBase.extend({
  type: z.literal("FORM_EMBED"),
  props: z.object({ heading: z.string().max(200).optional() }),
});

const CtaSectionSchema = SectionBase.extend({
  type: z.literal("CTA"),
  props: z.object({
    heading: z.string().max(200).optional(),
    buttonLabel: z.string().min(1).max(100),
    href: z.url({ protocol: /^https?$/ }),
  }),
});

export const LandingSectionSchema = z.discriminatedUnion("type", [
  HeroSectionSchema,
  TextSectionSchema,
  ImageSectionSchema,
  FormEmbedSectionSchema,
  CtaSectionSchema,
]);

export type LandingSection = z.infer<typeof LandingSectionSchema>;

// A page may embed at most one form, since the embed always resolves to LandingPage.formId.
const atMostOneFormEmbed = (sections: LandingSection[]) =>
  sections.filter((section) => section.type === "FORM_EMBED").length <= 1;

export const CreateLandingPageSchema = z.object({
  name: z.string().min(1),
  campaignId: z.string().optional(),
  sections: z
    .array(LandingSectionSchema)
    .max(20)
    .default([])
    .refine(atMostOneFormEmbed, {
      message: "A landing page can only embed one form",
    }),
  formId: z.string().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

export const UpdateLandingPageSchema = CreateLandingPageSchema.partial();
