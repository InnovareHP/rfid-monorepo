import { Injectable } from "@nestjs/common";
import type { z } from "zod";
import type Stripe from "stripe";
import { prisma } from "../../lib/prisma/prisma";
import { stripe } from "../../lib/stripe/stripe";
import type { ListTransactionsQuerySchema } from "./dto/billing.dto";

type ListTransactionsFilters = z.infer<typeof ListTransactionsQuerySchema>;

// Kept out of billing.service.ts on purpose: that file owns the subscription
// writes, this one only reads history.

export type PaymentMethodSummary = {
  type: string;
  brand: string | null;
  last4: string | null;
};

// Brand and last four are all Stripe exposes here, and all the UI needs. Nothing
// PCI-sensitive crosses this boundary.
const summarizePaymentMethod = (
  method: Stripe.PaymentMethod | null
): PaymentMethodSummary | null => {
  if (!method) return null;

  if (method.type === "card" && method.card) {
    return {
      type: "card",
      brand: method.card.brand,
      last4: method.card.last4,
    };
  }

  if (method.type === "us_bank_account" && method.us_bank_account) {
    return {
      type: "us_bank_account",
      brand: method.us_bank_account.bank_name ?? null,
      last4: method.us_bank_account.last4 ?? null,
    };
  }

  return null;
};

const paymentIntentIdOf = (invoice: Stripe.Invoice) => {
  const payments = (
    invoice as unknown as {
      payments?: { data?: { payment?: { payment_intent?: string | null } }[] };
    }
  ).payments;

  return payments?.data?.[0]?.payment?.payment_intent ?? null;
};

@Injectable()
export class BillingHistoryService {
  async listTransactions(
    organizationId: string,
    filters: ListTransactionsFilters
  ) {
    const where = {
      organizationId,
      ...(filters.type ? { type: filters.type } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        // Explicit select so metadata never reaches the client.
        select: {
          id: true,
          type: true,
          status: true,
          amountCents: true,
          currency: true,
          description: true,
          stripeInvoiceId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { data, total };
  }

  // Reaching the payment method from an invoice in one call would need five
  // expand levels and Stripe caps at four, so two flat calls run in parallel and
  // are joined on the PaymentIntent id.
  async listInvoices(organizationId: string, startingAfter?: string) {
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId },
      select: { stripeCustomerId: true },
    });

    // An org that has never reached checkout has no history, which is not an error.
    if (!organization?.stripeCustomerId) {
      return { data: [], hasMore: false };
    }

    const [invoices, intents] = await Promise.all([
      stripe.invoices.list({
        customer: organization.stripeCustomerId,
        limit: 20,
        expand: ["data.payments"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      }),
      stripe.paymentIntents.list({
        customer: organization.stripeCustomerId,
        limit: 100,
        expand: ["data.payment_method"],
      }),
    ]);

    const methodByIntent = new Map<string, PaymentMethodSummary | null>(
      intents.data.map((intent) => [
        intent.id,
        summarizePaymentMethod(
          typeof intent.payment_method === "string"
            ? null
            : intent.payment_method
        ),
      ])
    );

    return {
      data: invoices.data.map((invoice) => {
        const intentId = paymentIntentIdOf(invoice);

        return {
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          amountPaid: invoice.amount_paid,
          amountDue: invoice.amount_due,
          currency: invoice.currency,
          created: new Date(invoice.created * 1000),
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
          paymentMethod: intentId
            ? (methodByIntent.get(intentId) ?? null)
            : null,
        };
      }),
      hasMore: invoices.has_more,
    };
  }
}
