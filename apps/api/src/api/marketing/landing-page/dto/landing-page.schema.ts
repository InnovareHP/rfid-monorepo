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
    ctaLabel: z.string().max(100).optional(),
    ctaHref: z.url({ protocol: /^https?$/ }).optional(),
  }),
});

const ImageSectionSchema = SectionBase.extend({
  type: z.literal("IMAGE"),
  props: z.object({
    src: z.url({ protocol: /^https?$/ }),
    alt: z.string().max(200).default(""),
    caption: z.string().max(300).optional(),
    ctaLabel: z.string().max(100).optional(),
    ctaHref: z.url({ protocol: /^https?$/ }).optional(),
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

// Raw fields carry no .default(): a default still resolves when the key is
// omitted, even under .partial(), so an update built that way would blank the
// page's sections on a name-only save.
const nameField = z.string().min(1);
const sectionsField = z
  .array(LandingSectionSchema)
  .max(20)
  .refine(atMostOneFormEmbed, {
    message: "A landing page can only embed one form",
  });
const seoTitleField = z.string().max(70);
const seoDescriptionField = z.string().max(160);
const slugField = z
  .string()
  .min(1)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug may only contain lowercase letters, numbers and single hyphens"
  );

export const CreateLandingPageSchema = z.object({
  name: nameField,
  campaignId: z.string().optional(),
  sections: sectionsField.default([]),
  formId: z.string().optional(),
  seoTitle: seoTitleField.optional(),
  seoDescription: seoDescriptionField.optional(),
});

export const UpdateLandingPageSchema = z.object({
  name: nameField.optional(),
  campaignId: z.string().optional(),
  sections: sectionsField.optional(),
  formId: z.string().optional(),
  seoTitle: seoTitleField.optional(),
  seoDescription: seoDescriptionField.optional(),
  slug: slugField.optional(),
});
