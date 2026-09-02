import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MAX_SEATS, type BillingInterval } from "@dashboard/shared";
import { invalidateSubscriptionCache } from "../../guard/subscription/subscription.guard";
import { invalidateOrganizationSessionContext } from "../../lib/auth/session-context";
import { prisma } from "../../lib/prisma/prisma";
import {
  PLANS,
  findPlanByPriceId,
  getPlan,
  getPlanLimits,
  priceForInterval,
} from "../../lib/stripe/plans";
import { stripe } from "../../lib/stripe/stripe";
import type Stripe from "stripe";

// A past-due org keeps billing visibility; feature access is gated separately.
const HAS_PLAN_STATUSES = ["active", "trialing", "past_due"];

@Injectable()
export class BillingService {
  // Yearly is only offered where a yearly price id is configured, so the toggle
  // can never check out against an empty price.
  listPlans() {
    return PLANS.map((plan) => ({
      name: plan.name,
      label: plan.label,
      monthly: plan.monthly.pricePerSeat,
      yearly: plan.yearly.priceId ? plan.yearly.pricePerSeat : null,
      limits: plan.limits,
      freeTrialDays: plan.freeTrialDays,
      defaultSeats: plan.limits.seats,
    }));
  }

  private async getSubscription(organizationId: string) {
    return prisma.subscription.findFirst({
      where: {
        referenceId: organizationId,
        status: { in: HAS_PLAN_STATUSES },
      },
    });
  }

  // The dashboard gate, not just a plan label: feature flags, the seat list,
  // and any invoice still waiting on first payment.
  // A contract has no Stripe subscription, so nothing in getPlanCard describes
  // it and every control on the normal billing page calls a checkout endpoint
  // that does not apply. This is what the page renders instead, and the open
  // invoice is the part the customer actually needs: it is how they pay.
  async getContractCard(organizationId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { referenceId: organizationId, isCustom: true },
      select: {
        contractLabel: true,
        status: true,
        seats: true,
        customPriceCents: true,
        setupFeeCents: true,
        billingInterval: true,
        stripeCustomerId: true,
      },
    });

    if (!subscription) return null;

    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 10,
    });

    // Anything not yet settled is what there is to act on. Paid history is
    // already served by the invoices route.
    const outstanding = invoices.data.find((invoice) =>
      ["open", "uncollectible", "past_due"].includes(invoice.status ?? "")
    );

    return {
      label: subscription.contractLabel,
      status: subscription.status,
      seats: subscription.seats,
      priceCents: subscription.customPriceCents,
      setupFeeCents: subscription.setupFeeCents,
      billingInterval: subscription.billingInterval,
      outstandingInvoice: outstanding
        ? {
            id: outstanding.id,
            amountDueCents: outstanding.amount_due,
            currency: outstanding.currency,
            dueDate: outstanding.due_date
              ? new Date(outstanding.due_date * 1000).toISOString()
              : null,
            hostedInvoiceUrl: outstanding.hosted_invoice_url ?? null,
            pdfUrl: outstanding.invoice_pdf ?? null,
            status: outstanding.status,
          }
        : null,
    };
  }

  async getPlanCard(organizationId: string) {
    const [subscription, members] = await Promise.all([
      this.getSubscription(organizationId),
      prisma.member.findMany({
        where: { organizationId },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: { select: { email: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const plan = subscription ? getPlan(subscription.plan) : undefined;
    const limits = getPlanLimits(subscription?.plan);
    const seats = subscription?.seats ?? members.length;
    const interval: BillingInterval =
      subscription?.billingInterval === "year" ? "year" : "month";
    const price = plan ? priceForInterval(plan, interval) : null;

    return {
      plan: plan?.name ?? null,
      label: plan?.label ?? null,
      status: subscription?.status ?? null,
      interval,
      pricePerSeat: price?.pricePerSeat ?? null,
      seats,
      total: price ? price.pricePerSeat * seats : null,
      periodEnd: subscription?.periodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      trialEnd: subscription?.trialEnd ?? null,
      limits,
      // Seats are the ceiling, so these two bound the stepper.
      memberCount: members.length,
      maxSeats: MAX_SEATS,
      members: members.map((member) => ({
        id: member.id,
        role: member.role,
        email: member.user.email,
        name: member.user.name,
      })),
      pendingInvoice: await this.getPendingInvoice(
        subscription?.stripeSubscriptionId
      ),
    };
  }

  // Non-fatal: a Stripe failure returns the plan card without the invoice
  // rather than failing the whole dashboard gate.
  private async getPendingInvoice(stripeSubscriptionId?: string | null) {
    if (!stripeSubscriptionId) return null;

    try {
      const subscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId,
        { expand: ["latest_invoice"] }
      );
      const invoice = subscription.latest_invoice;
      if (!invoice || typeof invoice === "string") return null;
      if (invoice.status === "paid") return null;

      return {
        id: invoice.id,
        status: invoice.status,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      };
    } catch {
      return null;
    }
  }

  // Stripe and the local row are both written in-request rather than waiting
  // on a webhook, so the UI reflects the change immediately.
  private async setCancelAtPeriodEnd(
    organizationId: string,
    cancelAtPeriodEnd: boolean
  ) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription?.stripeSubscriptionId) {
      throw new NotFoundException(
        "No active subscription for this organization"
      );
    }

    const updated = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: cancelAtPeriodEnd }
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd,
        cancelAt: updated.cancel_at ? new Date(updated.cancel_at * 1000) : null,
      },
    });

    return { cancelAtPeriodEnd };
  }

  // Seats are purchased, not inferred from head count, so the quantity is
  // written to Stripe here and prorated onto an invoice straight away.
  async updateSeats(organizationId: string, seats: number) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription?.stripeSubscriptionId) {
      throw new NotFoundException(
        "No active subscription for this organization"
      );
    }

    const memberCount = await prisma.member.count({
      where: { organizationId },
    });

    if (seats < memberCount) {
      throw new BadRequestException(
        `This organization has ${memberCount} members. Remove members before dropping to ${seats} seats.`
      );
    }

    if (seats === subscription.seats) {
      throw new BadRequestException("Seat count is already " + seats);
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // The plan item is the only one carrying seats, so a plan price has to match
    // or there is nothing safe to change the quantity on.
    const item = stripeSubscription.items.data.find((entry) =>
      findPlanByPriceId(entry.price.id)
    );
    if (!item) {
      throw new NotFoundException("No seat price on this subscription");
    }

    const updated = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [{ id: item.id, quantity: seats }],
        proration_behavior: "always_invoice",
        expand: ["latest_invoice"],
      }
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { seats },
    });

    // Feature gating reads the cached entitlement, and the seat ceiling lives on
    // it, so a stale key would refuse the member the seat just paid for.
    await invalidateSubscriptionCache(organizationId);
    await invalidateOrganizationSessionContext(organizationId);

    await this.recordSeatChange(
      organizationId,
      subscription.plan,
      subscription.seats ?? memberCount,
      seats,
      updated.latest_invoice
    );

    return { seats };
  }

  // The proration invoice settles asynchronously, so the row is the change
  // itself and stays PENDING; the invoice webhook writes the settlement row.
  private async recordSeatChange(
    organizationId: string,
    plan: string,
    previousSeats: number,
    seats: number,
    latestInvoice: Stripe.Subscription["latest_invoice"]
  ) {
    const invoice =
      latestInvoice && typeof latestInvoice !== "string" ? latestInvoice : null;

    await prisma.transaction.create({
      data: {
        organizationId,
        type: "SEAT_CHANGE",
        status: "PENDING",
        amountCents: invoice?.amount_due ?? 0,
        currency: invoice?.currency ?? "usd",
        description: `${getPlan(plan)?.label ?? plan} — ${previousSeats} to ${seats} seats`,
        stripeInvoiceId: invoice?.id ?? null,
        metadata: { plan, previousSeats, seats },
      },
    });
  }

  cancel(organizationId: string) {
    return this.setCancelAtPeriodEnd(organizationId, true);
  }

  async resume(organizationId: string) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription?.cancelAtPeriodEnd) {
      throw new BadRequestException(
        "This subscription is not scheduled to cancel"
      );
    }
    return this.setCancelAtPeriodEnd(organizationId, false);
  }
}
