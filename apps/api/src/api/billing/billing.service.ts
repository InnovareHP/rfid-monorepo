import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PLANS, getPlan, getPlanLimits } from "../../lib/stripe/plans";
import { prisma } from "../../lib/prisma/prisma";
import { stripe } from "../../lib/stripe/stripe";

// A past-due org keeps billing visibility; feature access is gated separately.
const HAS_PLAN_STATUSES = ["active", "trialing", "past_due"];

@Injectable()
export class BillingService {
  listPlans() {
    return PLANS.map((plan) => ({
      name: plan.name,
      label: plan.label,
      pricePerSeat: plan.pricePerSeat,
      limits: plan.limits,
      freeTrialDays: plan.freeTrialDays,
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

    return {
      plan: plan?.name ?? null,
      label: plan?.label ?? null,
      status: subscription?.status ?? null,
      pricePerSeat: plan?.pricePerSeat ?? null,
      seats,
      monthlyTotal: plan ? plan.pricePerSeat * seats : null,
      periodEnd: subscription?.periodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      trialEnd: subscription?.trialEnd ?? null,
      limits,
      memberOverCap: members.length > limits.seats,
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
