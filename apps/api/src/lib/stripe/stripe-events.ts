import { CONTRACT_STATUS, CONTRACT_UNPAID_STATUS } from "@dashboard/shared";
import type * as React from "react";
import type Stripe from "stripe";
import { appConfig } from "../../config/app-config";
import {
  InvoiceEmail,
  type InvoiceEmailKind,
} from "../../react-email/invoice-email";
import { SubscriptionCanceledEmail } from "../../react-email/subscription-canceled-email";
import { SubscriptionUpdatedEmail } from "../../react-email/subscription-updated-email";
import { TrialEndingEmail } from "../../react-email/trial-ending-email";
import { invalidateSubscriptionCache } from "../../guard/subscription/subscription.guard";
import { invalidateOrganizationSessionContext } from "../auth/session-context";
import { renderEmailHtml } from "../aws/ses";
import { prisma } from "../prisma/prisma";
import { runWithTenant } from "../prisma/tenant-context";
import { emailQueue } from "../queue/email-queue";
import { findPlanByPriceId, getPlan, priceForInterval } from "./plans";
import { claimWebhookEvent, releaseWebhookEvent } from "./webhook-idempotency";

const PROVIDER = "stripe";

const formatAmount = (amount: number | null, currency: string | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase(),
  }).format((amount ?? 0) / 100);

const formatDate = (epochSeconds: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(epochSeconds * 1000));

const customerIdOf = (subscription: Stripe.Subscription) =>
  typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

const planFromPriceId = (priceId: string | null | undefined) =>
  priceId ? findPlanByPriceId(priceId) : undefined;

const billingUrl = (organizationId: string) =>
  `${appConfig.WEBSITE_URL}/${organizationId}/settings/billing`;

type BillingAudience = {
  organizationId: string;
  organizationName: string;
  seats: number;
  owners: { name: string; email: string }[];
};

// Owners are who can act on a billing change, so they are who hears about one.
const resolveAudience = async (
  customerId: string
): Promise<BillingAudience | null> => {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { seats: true, referenceId: true },
  });
  if (!subscription) return null;

  const organization = await prisma.organization.findFirst({
    where: { id: subscription.referenceId },
    select: { name: true },
  });
  if (!organization) return null;

  const owners = await prisma.member.findMany({
    where: { organizationId: subscription.referenceId, role: "owner" },
    select: { user: { select: { name: true, email: true } } },
  });
  if (owners.length === 0) return null;

  return {
    organizationId: subscription.referenceId,
    organizationName: organization.name,
    seats: subscription.seats ?? 1,
    owners: owners.map((owner) => ({
      name: owner.user.name,
      email: owner.user.email,
    })),
  };
};

const queueToOwners = async (
  audience: BillingAudience,
  subject: string,
  build: (ownerName: string) => React.ReactElement
) => {
  for (const owner of audience.owners) {
    await emailQueue.add("send", {
      to: owner.email,
      subject,
      html: await renderEmailHtml(build(owner.name)),
      from: `${appConfig.APP_EMAIL}`,
    });
  }
};

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

// The ledger row is written at settlement, not on read. Idempotent by invoice id
// because Stripe retries, and the webhook claim is released on handler failure.
const recordInvoiceTransaction = async (
  customerId: string,
  invoice: Stripe.Invoice,
  status: "COMPLETED" | "FAILED"
) => {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { plan: true, seats: true, referenceId: true },
  });
  if (!subscription || !invoice.id) return;

  const planLabel = getPlan(subscription.plan)?.label ?? subscription.plan;
  const seats = subscription.seats ?? 1;

  // The webhook runs outside any request, so the tenant store is opened here or
  // the scope extension rejects the write.
  await runWithTenant(subscription.referenceId, async () => {
    const existing = await prisma.transaction.findFirst({
      where: { stripeInvoiceId: invoice.id, status },
      select: { id: true },
    });
    if (existing) return;

    await prisma.transaction.create({
      data: {
        organizationId: subscription.referenceId,
        type: "SUBSCRIPTION",
        status,
        amountCents:
          status === "COMPLETED" ? invoice.amount_paid : invoice.amount_due,
        currency: invoice.currency ?? "usd",
        description: `${planLabel} — ${seats} ${seats === 1 ? "seat" : "seats"}`,
        stripeInvoiceId: invoice.id,
        metadata: { plan: subscription.plan, seats },
      },
    });
  });
};

// Only contract rows are touched: a plan subscription carries its status from
// customer.subscription.* and must not be second-guessed from an invoice.
const applyContractInvoiceOutcome = async (
  customerId: string,
  paid: boolean
) => {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId, isCustom: true },
    select: { id: true, stripeSubscriptionId: true, status: true },
  });

  if (!subscription) return;

  // A contract that has never been paid stays locked when an invoice fails:
  // there is no earlier period to keep readable. One that has been paid before
  // drops to read_only instead, so a failed renewal does not shut a working
  // organization out of its own records while it is chased.
  const neverPaid = subscription.status === CONTRACT_UNPAID_STATUS;
  const next = paid
    ? CONTRACT_STATUS
    : neverPaid
      ? CONTRACT_UNPAID_STATUS
      : "unpaid";
  if (subscription.status === next) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: next },
  });

  const organization = await prisma.subscription.findUnique({
    where: { id: subscription.id },
    select: { referenceId: true },
  });

  if (organization) {
    await invalidateSubscriptionCache(organization.referenceId);
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

      // An upcoming invoice has not been charged, so it earns no ledger row.
      if (kind !== "upcoming") {
        await recordInvoiceTransaction(
          customerId,
          invoice,
          kind === "paid" ? "COMPLETED" : "FAILED"
        );
      }

      // A contract row has no Stripe subscription, so customer.subscription.*
      // never fires for it and the invoice is the only signal that its access
      // should change. unpaid maps to read_only, so an unpaid contract keeps
      // its data visible while it is chased.
      if (kind !== "upcoming") {
        await applyContractInvoiceOutcome(customerId, kind === "paid");
      }

      await notifyOwners(customerId, kind, invoice);
      return;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;

      // A contract is not provisioned by the plugin and has no tier to be
      // re-initialised from, so dates and status are taken off Stripe here and
      // its negotiated limits are left untouched.
      await refreshCustomSubscription(subscription);

      const previousItems = event.data.previous_attributes?.items;
      const previousPlan = planFromPriceId(previousItems?.data?.[0]?.price?.id);

      // Only a real plan change is worth an email — quantity, status and
      // period rolls fire this same event constantly.
      if (!previousPlan) return;

      const item = subscription.items.data[0];
      const newPlan = planFromPriceId(item?.price?.id);
      if (!newPlan || newPlan.name === previousPlan.name) return;

      const audience = await resolveAudience(customerIdOf(subscription));
      if (!audience) return;

      const quantity = item?.quantity ?? audience.seats;
      const interval =
        item?.price?.recurring?.interval === "year" ? "year" : "month";

      await queueToOwners(
        audience,
        `Subscription updated for ${audience.organizationName}`,
        (ownerName) =>
          SubscriptionUpdatedEmail({
            recipientName: ownerName,
            organizationName: audience.organizationName,
            previousPlan: previousPlan.label,
            newPlan: newPlan.label,
            billingAmount: `$${
              priceForInterval(newPlan, interval).pricePerSeat * quantity
            }/${interval === "year" ? "yr" : "mo"}`,
            effectiveOn: formatDate(event.created),
            billingUrl: billingUrl(audience.organizationId),
          })
      );
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const audience = await resolveAudience(customerIdOf(subscription));
      if (!audience) return;

      const plan = planFromPriceId(subscription.items.data[0]?.price?.id);

      await queueToOwners(
        audience,
        `Subscription canceled for ${audience.organizationName}`,
        (ownerName) =>
          SubscriptionCanceledEmail({
            recipientName: ownerName,
            organizationName: audience.organizationName,
            planLabel: plan?.label ?? "Subscription",
            accessUntil: formatDate(
              subscription.ended_at ?? subscription.canceled_at ?? event.created
            ),
            billingUrl: billingUrl(audience.organizationId),
          })
      );
      return;
    }

    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object;
      if (!subscription.trial_end) return;

      const audience = await resolveAudience(customerIdOf(subscription));
      if (!audience) return;

      const plan = planFromPriceId(subscription.items.data[0]?.price?.id);
      const daysRemaining = Math.max(
        Math.ceil((subscription.trial_end - event.created) / 86400),
        1
      );

      await queueToOwners(
        audience,
        `Your Refidly trial ends in ${daysRemaining} days`,
        (ownerName) =>
          TrialEndingEmail({
            recipientName: ownerName,
            organizationName: audience.organizationName,
            daysRemaining,
            planLabel: plan?.label ?? "Trial",
            trialEndDate: formatDate(subscription.trial_end as number),
            seats: audience.seats,
            billingUrl: billingUrl(audience.organizationId),
          })
      );
      return;
    }

    default:
      return;
  }
};

// handleEvent returns early for most subscription events, so the guard cache is
// cleared here instead. The plugin may still write the row after this runs, in
// which case the entry is only stale until the short TTL expires.
// Stripe moved the period bounds onto the subscription item in the 2024 API,
// so both shapes are read before giving up.
const periodBoundsOf = (subscription: Stripe.Subscription) => {
  const item = subscription.items.data[0] as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const legacy = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };

  return {
    start: item?.current_period_start ?? legacy.current_period_start ?? null,
    end: item?.current_period_end ?? legacy.current_period_end ?? null,
  };
};

// Writes dates and status only. Never plan, seats or customLimits: those are
// the contract, and Stripe is not the source of truth for them.
//
// A contract awaiting its first payment is excluded from the status write.
// Stripe activates a send_invoice subscription the moment it is created, so
// copying its status here would report "active" and let an unpaid organization
// straight into the dashboard. The first invoice.payment_succeeded is what
// clears that, below.
const refreshCustomSubscription = async (subscription: Stripe.Subscription) => {
  const { start, end } = periodBoundsOf(subscription);

  await prisma.subscription.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
      isCustom: true,
      status: { not: CONTRACT_UNPAID_STATUS },
    },
    data: {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...(start ? { periodStart: new Date(start * 1000) } : {}),
      ...(end ? { periodEnd: new Date(end * 1000) } : {}),
    },
  });

  await prisma.subscription.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
      isCustom: true,
      status: CONTRACT_UNPAID_STATUS,
    },
    data: {
      ...(start ? { periodStart: new Date(start * 1000) } : {}),
      ...(end ? { periodEnd: new Date(end * 1000) } : {}),
    },
  });
};

const clearEntitlementCache = async (event: Stripe.Event) => {
  if (!event.type.startsWith("customer.subscription.")) return;

  const customerId = customerIdOf(event.data.object as Stripe.Subscription);
  if (!customerId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { referenceId: true },
  });
  if (!subscription) return;

  await invalidateSubscriptionCache(subscription.referenceId);
  await invalidateOrganizationSessionContext(subscription.referenceId);
};

export const StripeHelper = async (event: Stripe.Event) => {
  const claimed = await claimWebhookEvent(PROVIDER, event.id);
  if (!claimed) return;

  try {
    await clearEntitlementCache(event);
    await handleEvent(event);
  } catch (error) {
    await releaseWebhookEvent(PROVIDER, event.id);
    throw error;
  }
};
