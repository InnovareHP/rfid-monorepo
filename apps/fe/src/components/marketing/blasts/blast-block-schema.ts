import { z } from "zod";

// Local FE mirror of the backend blast block schemas — never import the API's
// Zod module across the API/FE boundary (same precedent as landing pages).
const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Must be a hex color");

const optionalUrl = z
  .string()
  .optional()
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Must be a valid http(s) URL",
  });

export const textStyleSchema = z.object({
  fontFamily: z.string().max(80).optional(),
  fontSize: z.number().int().min(8).max(72).optional(),
  color: hexColor.optional(),
  align: z.enum(["left", "center", "right", "justify"]).optional(),
});

const surface = z.object({
  backgroundColor: hexColor.optional(),
  backgroundImage: optionalUrl,
});

export const blastBlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("HEADLINE"),
    props: surface.extend({
      heading: z.string().max(2000),
      headingStyle: textStyleSchema.optional(),
      subheading: z.string().max(2000).optional(),
      subheadingStyle: textStyleSchema.optional(),
      logo: optionalUrl,
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("TEXT"),
    props: surface.extend({
      heading: z.string().max(2000).optional(),
      headingStyle: textStyleSchema.optional(),
      body: z.string().max(10000),
      bodyStyle: textStyleSchema.optional(),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("IMAGE"),
    props: surface.extend({
      src: optionalUrl,
      alt: z.string().max(200).optional(),
      caption: z.string().max(300).optional(),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("SEPARATOR"),
    props: surface.extend({ color: hexColor.optional() }),
  }),
  // Draggable like any other block. The send still guarantees an unsubscribe
  // link, so removing this changes the layout, never the opt-out.
  z.object({
    id: z.string().min(1),
    type: z.literal("FOOTER"),
    props: surface.extend({
      text: z.string().max(500).optional(),
      unsubscribeLabel: z.string().max(120).optional(),
      // For a forwarded copy: the reader is not on the list, so the footer can
      // offer the org's own signup. The link is filled in at send.
      showSubscribe: z.boolean().optional(),
      subscribeLabel: z.string().max(120).optional(),
      subscribeAsButton: z.boolean().optional(),
      textStyle: textStyleSchema.optional(),
    }),
  }),
  // A call to action for readers who are not on the list yet. There is no URL
  // to author: the org's own signup link is merged in at send.
  z.object({
    id: z.string().min(1),
    type: z.literal("SUBSCRIBE"),
    props: surface.extend({
      description: z.string().max(500).optional(),
      descriptionStyle: textStyleSchema.optional(),
      label: z.string().min(1, "Button label is required").max(100),
      buttonColor: hexColor.optional(),
      textColor: hexColor.optional(),
    }),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("BUTTON"),
    props: surface.extend({
      label: z.string().min(1, "Button label is required").max(100),
      href: optionalUrl,
      buttonColor: hexColor.optional(),
    }),
  }),
]);

// Shared by both editors. bodyHtml carries the classic body; blocks carry the
// drag and drop body, and the server renders one from the other.
export const blastFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  campaignId: z.string().optional(),
  groupIds: z.array(z.string()).min(1, "Pick at least one group"),
  bodyHtml: z.string(),
  blocks: z.array(blastBlockSchema).max(30),
});

export type BlastBlock = z.infer<typeof blastBlockSchema>;
export type BlastBlockType = BlastBlock["type"];
export type BlastTextStyle = z.infer<typeof textStyleSchema>;
export type BlastFormValues = z.infer<typeof blastFormSchema>;

export const createDefaultBlock = (type: BlastBlockType): BlastBlock => {
  const id = crypto.randomUUID();

  switch (type) {
    case "HEADLINE":
      return {
        id,
        type,
        props: {
          heading: "New Hero Heading",
          subheading: "Hero subheading appears here",
          backgroundColor: "#f4f9ff",
        },
      };
    case "TEXT":
      return {
        id,
        type,
        props: { heading: "Heading", body: "Body text appears here" },
      };
    case "IMAGE":
      return { id, type, props: { src: "", alt: "" } };
    case "SEPARATOR":
      return { id, type, props: {} };
    case "FOOTER":
      return {
        id,
        type,
        props: {
          unsubscribeLabel: "Unsubscribe from these emails",
          subscribeLabel: "Subscribe to these emails",
        },
      };
    case "SUBSCRIBE":
      return {
        id,
        type,
        props: {
          description: "Get these updates in your own inbox.",
          label: "Subscribe",
          backgroundColor: "#f4f9ff",
        },
      };
    case "BUTTON":
      return { id, type, props: { label: "Learn More", href: "" } };
  }
};
