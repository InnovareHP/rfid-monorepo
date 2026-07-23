import type Stripe from "stripe";

// Stripe Tax params for every checkout: Tax needs a billing address for
// jurisdiction, tax_id_collection enables B2B reverse-charge. With no
// registrations in the Stripe dashboard the computed tax is zero.
export const TAX_CHECKOUT_BASE = {
  automatic_tax: { enabled: true },
  billing_address_collection: "required",
  tax_id_collection: { enabled: true },
} satisfies Partial<Stripe.Checkout.SessionCreateParams>;
