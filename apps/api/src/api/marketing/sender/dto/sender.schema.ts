import { z } from "zod";

// Labels and hostnames only; the API derives the address and never trusts a
// client-supplied one for a domain it has not verified.
const hostname = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
    "Enter a domain like acme-health.com"
  );

const localPart = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{1,64}$/, "Use letters, numbers, dots, dashes");

export const SENDER_KINDS = ["PERSONAL", "CUSTOM_DOMAIN"] as const;

// One flat shape rather than a discriminated union: createZodDto builds a class,
// and a class cannot carry a union as its constructor return type.
export const CreateSenderSchema = z
  .object({
    kind: z.enum(SENDER_KINDS),
    label: z.string().min(1),
    fromName: z.string().optional(),
    domain: hostname.optional(),
    mailbox: localPart.default("hello"),
    replyTo: z.email().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "CUSTOM_DOMAIN" && !values.domain) {
      ctx.addIssue({
        code: "custom",
        path: ["domain"],
        message: "A domain is required",
      });
    }
  });

export const UpdateSenderSchema = z.object({
  label: z.string().min(1).optional(),
  fromName: z.string().nullable().optional(),
  replyTo: z.email().nullable().optional(),
});
