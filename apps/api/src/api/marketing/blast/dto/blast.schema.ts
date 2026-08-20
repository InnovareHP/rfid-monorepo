import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Must be a hex color");

const optionalUrl = z
  .string()
  .optional()
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Must be a valid http(s) URL",
  });

const align = z.enum(["left", "center", "right", "justify"]);

// Typography carried per text run, since the editor sets these per block.
const textStyle = z.object({
  fontFamily: z.string().max(80).optional(),
  fontSize: z.number().int().min(8).max(72).optional(),
  color: hexColor.optional(),
  align: align.optional(),
});

const surface = z.object({
  backgroundColor: hexColor.optional(),
  backgroundImage: optionalUrl,
});

const blockBase = { id: z.string().min(1) };

// Inline markup only — the classic body and every rich block are sanitized to
// this same tag set before they are stored.
export const blastBlockSchema = z.discriminatedUnion("type", [
  z.object({
    ...blockBase,
    type: z.literal("HEADLINE"),
    props: surface.extend({
      heading: z.string().max(2000),
      headingStyle: textStyle.optional(),
      subheading: z.string().max(2000).optional(),
      subheadingStyle: textStyle.optional(),
      logo: optionalUrl,
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("TEXT"),
    props: surface.extend({
      heading: z.string().max(2000).optional(),
      headingStyle: textStyle.optional(),
      body: z.string().max(10000),
      bodyStyle: textStyle.optional(),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("IMAGE"),
    props: surface.extend({
      src: optionalUrl,
      alt: z.string().max(200).optional(),
      caption: z.string().max(300).optional(),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("SEPARATOR"),
    props: surface.extend({ color: hexColor.optional() }),
  }),
  // Draggable like any other block. The send still guarantees an unsubscribe
  // link, so removing this changes the layout, never the opt-out.
  z.object({
    ...blockBase,
    type: z.literal("FOOTER"),
    props: surface.extend({
      text: z.string().max(500).optional(),
      unsubscribeLabel: z.string().max(120).optional(),
      // For a forwarded copy: the reader is not on the list, so the footer can
      // offer the org's own signup. The link is filled in at send.
      showSubscribe: z.boolean().optional(),
      subscribeLabel: z.string().max(120).optional(),
      subscribeAsButton: z.boolean().optional(),
      textStyle: textStyle.optional(),
    }),
  }),
  // A call to action for readers who are not on the list yet. There is no URL
  // to author: the org's own signup link is merged in at send.
  z.object({
    ...blockBase,
    type: z.literal("SUBSCRIBE"),
    props: surface.extend({
      description: z.string().max(500).optional(),
      descriptionStyle: textStyle.optional(),
      label: z.string().min(1).max(100),
      buttonColor: hexColor.optional(),
      textColor: hexColor.optional(),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("BUTTON"),
    props: surface.extend({
      label: z.string().min(1).max(100),
      href: optionalUrl,
      buttonColor: hexColor.optional(),
    }),
  }),
]);

export const blastBlocksSchema = z.array(blastBlockSchema).max(30);

export const CreateBlastSchema = z.object({
  name: z.string().min(1),
  campaignId: z.string().nullable().optional(),
  subject: z.string().min(1),
  // Classic blasts author this directly; drag and drop blasts have it rendered
  // from blocks, so it is optional on the wire.
  bodyHtml: z.string().default(""),
  editorType: z.enum(["DRAG_DROP", "CLASSIC"]).default("DRAG_DROP"),
  blocks: blastBlocksSchema.optional(),
  // A draft may have none yet; send is what requires at least one. Groups may
  // target different modules; the send unions them and dedupes on record.
  groupIds: z.array(z.string()).default([]),
  scheduledAt: z.string().optional(),
});

export const UpdateBlastSchema = CreateBlastSchema.partial();

export const SendBlastSchema = z.object({
  sendVia: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});

export const TestSendBlastSchema = SendBlastSchema.extend({
  to: z.string().email(),
});
