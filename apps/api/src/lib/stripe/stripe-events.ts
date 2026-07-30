import type Stripe from "stripe";
import { appConfig } from "../../config/app-config";
import {
  InvoiceEmail,
  type InvoiceEmailKind,
} from "../../react-email/invoice-email";
import { renderEmailHtml } from "../aws/ses";
import { prisma } from "../prisma/prisma";
import { emailQueue } from "../queue/email-queue";
import { getPlan } from "./plans";
import { claimWebhookEvent, releaseWebhookEvent } from "./webhook-idempotency";

const PROVIDER = "stripe";

const formatAmount = (amount: number | null, currency: string | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase(),
  }).format((amount ?? 0) / 100);

// Owners are who can act on a billing problem, so they are who hears about one.
const notifyOwners = async (
  customerId: string,
  kind: InvoiceEmailKind,
  invoice: Stripe.Invoice
) => {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { plan: true, seats: true, referenceId: true },
  });
  if (!subscription) return;

  const organization = await prisma.organization.findFirst({
    where: { id: subscription.referenceId },
    select: { name: true },
  });
  if (!organization) return;

  const owners = await prisma.member.findMany({
    where: { organizationId: subscription.referenceId, role: "owner" },
    select: { user: { select: { email: true } } },
  });
  if (owners.length === 0) return;

  const nextAttempt = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000).toUTCString()
    : null;

  const html = await renderEmailHtml(
    InvoiceEmail({
      kind,
      organizationName: organization.name,
      planLabel: getPlan(subscription.plan)?.label ?? subscription.plan,
      seats: subscription.seats ?? 1,
      amount: formatAmount(invoice.amount_due, invoice.currency),
      invoiceUrl: invoice.hosted_invoice_url,
      nextAttempt,
    })
  );

  const subjects: Record<InvoiceEmailKind, string> = {
    paid: `Payment received for ${organization.name}`,
    failed: `Payment failed for ${organization.name}`,
    upcoming: `Upcoming renewal for ${organization.name}`,
  };

  for (const owner of owners) {
    await emailQueue.add("send", {
      to: owner.user.email,
      subject: subjects[kind],
      html,
      from: `${appConfig.APP_EMAIL}`,
    });
  }
};

// The plugin owns every write to the subscription row: it reads the period off
// items.data[0] and resolves the plan from the price. Duplicating that here is
// how the row ends up with a hardcoded plan and a wrong period.
const handleEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    case "invoice.upcoming": {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId) return;

      const kind: InvoiceEmailKind =
        event.type === "invoice.payment_succeeded"
          ? "paid"
          : event.type === "invoice.payment_failed"
            ? "failed"
            : "upcoming";

      await notifyOwners(customerId, kind, invoice);
      return;
    }

    default:
      return;
  }
};

export const StripeHelper = async (event: Stripe.Event) => {
  const claimed = await claimWebhookEvent(PROVIDER, event.id);
  if (!claimed) return;

  try {
    await handleEvent(event);
  } catch (error) {
    await releaseWebhookEvent(PROVIDER, event.id);
    throw error;
  }
};
