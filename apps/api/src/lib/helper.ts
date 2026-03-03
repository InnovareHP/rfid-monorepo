import { normalizeFieldName } from "@dashboard/shared";
import { BoardFieldType, Field, FieldOption } from "@prisma/client";
import { render } from "@react-email/render";
import Stripe from "stripe";
import { prisma } from "./prisma/prisma";

export const StripeHelper = async (event: Stripe.Event) => {
  switch (event.type) {
    // case "product.created": {
    //   const product = event.data.object;

    //   await prisma.plan.create({
    //     data: {
    //       plan_id: product.id,
    //       name: product.name,
    //       plan_photo: product.images[0],
    //       plan_description: product.description,
    //       isActive: true,
    //       plan_createdAt: new Date(),
    //     },
    //   });
    //   break;
    // }

    // case "product.updated": {
    //   const product = event.data.object;
    //   const metadata = product.metadata;
    //   const previous = event.data.previous_attributes ?? {};

    //   const updateData: any = {};

    //   if (previous.name !== undefined) {
    //     updateData.name = product.name;
    //   }

    //   if (previous.default_price !== undefined) {
    //     updateData.priceId = product.default_price;
    //   }

    //   if (previous.description !== undefined) {
    //     updateData.plan_description = product.description;
    //   }

    //   // Always sync metadata
    //   updateData.roleAvailable = metadata.roleAvailable;
    //   updateData.type = metadata.type;
    //   updateData.plan_limit = metadata.plan_limit;

    //   await prisma.plan.upsert({
    //     where: { plan_id: product.id },
    //     update: updateData,
    //     create: {
    //       plan_id: product.id,
    //       name: product.name,
    //       plan_photo: product.images[0],
    //       plan_description: product.description,
    //       priceId: product.default_price as string,
    //       roleAvailable: metadata.roleAvailable,
    //       type: metadata.type,
    //       plan_limit: metadata.plan_limit,
    //       isActive: true,
    //       plan_createdAt: new Date(product.created * 1000),
    //     },
    //   });

    //   break;
    // }

    // case "product.deleted": {
    //   const product = event.data.object;

    //   await prisma.plan.update({
    //     where: { plan_id: product.id },
    //     data: {
    //       isActive: false,
    //     },
    //   });

    //   break;
    // }

    case "payment_intent.succeeded": {
      console.log("[payment_intent.succeeded]", event);

      const payment = event.data.object as unknown as any;

      await prisma.subscription.update({
        where: {
          stripeCustomerId: payment.customer as string,
        },
        data: {
          status: payment.status,
          cancelAtPeriodEnd: payment.cancel_at_period_end,
          seats: payment.items.data[0]?.quantity ?? 1,
          trialStart: new Date(
            (payment.period_start ?? 0) * 1000
          ),
          trialEnd: new Date((payment.period_end ?? 0) * 1000),
        },
      });

      break;
    }

    case "customer.subscription.created": {
      console.log("[customer.subscription.created]", event);

      const subscription = event.data.object as unknown as any;

      await prisma.subscription.upsert({
        where: {
          stripeCustomerId: subscription.customer as string,
        },
        update: {
          plan: "dashboard",
          referenceId: subscription.metadata.referenceId ?? "",
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          periodStart: new Date(),
          cancelAtPeriodEnd: false,
          seats: subscription.items.data[0]?.quantity ?? 1,
        },
        create: {
          plan: "dashboard",
          referenceId: subscription.metadata.referenceId ?? "",
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          periodStart: new Date(),
          cancelAtPeriodEnd: false,
          seats: subscription.items.data[0]?.quantity ?? 1,
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as unknown as any;

      await prisma.subscription.update({
        where: {
          stripeCustomerId: sub.customer as string,
        },

        data: {
          status: sub.cancel_at !== null ? "canceled" : sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          seats: sub.items.data[0]?.quantity ?? 1,
          trialStart: sub.trial_start
            ? new Date(sub.trial_start * 1000)
            : null,

          trialEnd: sub.trial_end
            ? new Date(sub.trial_end * 1000)
            : null,
        },
      });

      break;
    }
    case "customer.subscription.deleted": {
      console.log("[customer.subscription.deleted]", event);

      const subscription = event.data.object;

      const canceledAtTrialEnd =
        subscription.canceled_at &&
        subscription.trial_end &&
        subscription.canceled_at === subscription.trial_end;

      await prisma.subscription.update({
        where: {
          stripeCustomerId: subscription.customer as string,
        },
        data: {
          status: "canceled",

          periodEnd: subscription.ended_at
            ? new Date(subscription.ended_at * 1000)
            : null,

          cancelAtPeriodEnd: canceledAtTrialEnd ? true : false,
        },
      });

      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
};

export const generateTemplate = (template: React.ReactNode) => {
  return render(template);
};

export const findLeadFieldFromCSV = (
  csvHeader: string,
  fields: Field & { FieldOption: FieldOption[] }[]
): (Field & { FieldOption: FieldOption[] }) | null => {
  const header = normalizeFieldName(csvHeader);

  const foundField = fields.find(
    (field: Field & { FieldOption: FieldOption[] }) =>
      normalizeFieldName(field.fieldName) === header
  );

  if (!foundField) {
    return null;
  }

  return foundField as unknown as Field & {
    FieldOption: FieldOption[];
  };
};

export const isSelectType = (type: BoardFieldType): boolean => {
  return type === "DROPDOWN" || type === "STATUS" || type === "MULTISELECT";
};
