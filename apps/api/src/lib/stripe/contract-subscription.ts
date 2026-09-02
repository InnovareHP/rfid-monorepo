import { stripe } from "./stripe";

// A contract is a real Stripe subscription billed by invoice. send_invoice
// means Stripe does not pull from a saved payment method: it finalizes and
// emails an invoice each period, and the customer pays it. Renewal is therefore
// Stripe's job, not a cron of ours, and refreshCustomSubscription in
// stripe-events already carries the dates and status back onto the row.
//
// The price is inline rather than a catalogue Price: a negotiated amount exists
// for exactly one organization, so putting it in the shared plan catalogue
// would make it look like something another org could buy.
const DAYS_UNTIL_DUE = 30;

const intervalOf = (billingInterval: string) =>
  billingInterval === "annual" ? "year" : "month";

export const createContractSubscription = async (input: {
  customerId: string;
  organizationId: string;
  label: string;
  priceCents: number;
  setupFeeCents: number;
  billingInterval: string;
}) => {
  const metadata = {
    organizationId: input.organizationId,
    contractLabel: input.label,
  };

  // An inline price still has to hang off a Product, so the contract gets its
  // own rather than borrowing a plan's: a negotiated amount belongs to exactly
  // one organization and must never look like something else could buy it.
  const product = await stripe.products.create({
    name: input.label,
    metadata,
  });

  // An add_invoice_item carries no description of its own, so the line reads as
  // whatever its product is called. The fee needs its own product or it would
  // appear on the invoice under the contract's name, indistinguishable from the
  // period charge.
  const feeProduct =
    input.setupFeeCents > 0
      ? await stripe.products.create({
          name: `${input.label} — one-off setup fee`,
          metadata,
        })
      : null;

  const subscription = await stripe.subscriptions.create({
    customer: input.customerId,
    collection_method: "send_invoice",
    days_until_due: DAYS_UNTIL_DUE,
    metadata,
    items: [
      {
        price_data: {
          currency: "usd",
          product: product.id,
          unit_amount: input.priceCents,
          recurring: { interval: intervalOf(input.billingInterval) },
        },
      },
    ],
    // A setup fee belongs to the first invoice only, which is exactly what
    // add_invoice_items means: it is not part of the recurring item, so it
    // never appears on a renewal.
    ...(feeProduct
      ? {
          add_invoice_items: [
            {
              price_data: {
                currency: "usd",
                product: feeProduct.id,
                unit_amount: input.setupFeeCents,
              },
            },
          ],
        }
      : {}),
    expand: ["latest_invoice"],
  });

  const invoice = subscription.latest_invoice;
  const finalized =
    invoice && typeof invoice !== "string" && invoice.id
      ? // Stripe leaves the first send_invoice invoice as a draft, and a draft
        // is not emailed and cannot be paid. Sending it is what makes it real.
        await stripe.invoices.sendInvoice(invoice.id)
      : null;

  return {
    subscriptionId: subscription.id,
    invoiceId: finalized?.id ?? null,
    hostedInvoiceUrl: finalized?.hosted_invoice_url ?? null,
  };
};

// A charge outside the billing cycle: extra seats mid-term, a negotiated
// adjustment. Raised against the customer rather than the subscription so it
// does not disturb the recurring amount or the period.
export const issueContractAdjustment = async (input: {
  customerId: string;
  organizationId: string;
  description: string;
  amountCents: number;
}) => {
  if (input.amountCents <= 0) return null;

  const invoice = await stripe.invoices.create({
    customer: input.customerId,
    collection_method: "send_invoice",
    days_until_due: DAYS_UNTIL_DUE,
    pending_invoice_items_behavior: "exclude",
    metadata: { organizationId: input.organizationId },
  });

  await stripe.invoiceItems.create({
    customer: input.customerId,
    invoice: invoice.id,
    amount: input.amountCents,
    currency: "usd",
    description: input.description,
  });

  const sent = await stripe.invoices.sendInvoice(invoice.id);

  return {
    invoiceId: sent.id,
    hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
  };
};
