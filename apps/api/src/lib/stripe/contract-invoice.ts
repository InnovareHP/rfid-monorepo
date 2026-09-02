import { stripe } from "./stripe";

// A contract is collected by invoice, not by card on file: there is no Stripe
// subscription behind it, so nothing renews on its own and each period is
// invoiced deliberately. That is the point - the customer asked to be billed
// this way - but it does mean a contract needs a renewal job later, not a
// webhook.
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
