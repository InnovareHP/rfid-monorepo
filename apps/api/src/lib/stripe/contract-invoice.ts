import { stripe } from "./stripe";

// A contract is collected by invoice rather than charged automatically: there
// is no Stripe subscription behind it, so nothing renews on its own and each
// period is invoiced deliberately. That means a contract needs a renewal job
// later, not a webhook.
//
// It does not mean cards are out. send_invoice only decides that Stripe will
// not pull from a saved payment method on its own - the hosted invoice page
// still takes a card.
//
// payment_method_types is deliberately not set: naming us_bank_account here
// makes Stripe reject the whole invoice unless ACH debits are enabled on the
// account, which turned an admin action into a 500. Unset means the account's
// own invoice defaults apply, which is what every other invoice it sends uses.
const DAYS_UNTIL_DUE = 30;

const periodLabel = (billingInterval: string) =>
  billingInterval === "annual" ? "12 months" : "1 month";

export const issueContractInvoice = async (input: {
  customerId: string;
  organizationId: string;
  label: string;
  priceCents: number;
  setupFeeCents: number;
  billingInterval: string;
}) => {
  // A comped contract has nothing to collect, and an invoice for zero would
  // only confuse whoever opens it.
  if (input.priceCents <= 0 && input.setupFeeCents <= 0) return null;

  const invoice = await stripe.invoices.create({
    customer: input.customerId,
    collection_method: "send_invoice",
    days_until_due: DAYS_UNTIL_DUE,
    // Line items are attached to this invoice by id rather than swept up from
    // whatever else is pending on the customer.
    pending_invoice_items_behavior: "exclude",
    metadata: {
      organizationId: input.organizationId,
      contractLabel: input.label,
    },
  });

  if (input.priceCents > 0) {
    await stripe.invoiceItems.create({
      customer: input.customerId,
      invoice: invoice.id,
      amount: input.priceCents,
      currency: "usd",
      description: `${input.label} — ${periodLabel(input.billingInterval)}`,
    });
  }

  if (input.setupFeeCents > 0) {
    await stripe.invoiceItems.create({
      customer: input.customerId,
      invoice: invoice.id,
      amount: input.setupFeeCents,
      currency: "usd",
      description: `${input.label} — one-off setup fee`,
    });
  }

  // Finalizes and emails it. The hosted page is what the customer pays on.
  const sent = await stripe.invoices.sendInvoice(invoice.id);

  return {
    invoiceId: sent.id,
    hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
    total: sent.total,
  };
};
