import { normalizeFieldName } from "@dashboard/shared";
import { BoardFieldType, Field, FieldOption } from "@prisma/client";
import { render } from "@react-email/render";
import Stripe from "stripe";
import { prisma } from "./prisma/prisma";

export const StripeHelper = async (event: Stripe.Event) => {
  switch (event.type) {
    // case "product.created": {
    //   const product = event.data.object;

    //   await prisma.plan_table.create({
    //     data: {
    //       plan_id: product.id,
    //       plan_name: product.name,
    //       plan_photo: product.images[0],
    //       plan_description: product.description,
    //       plan_is_active: true,
    //       plan_created_at: new Date(),
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
    //     updateData.plan_name = product.name;
    //   }

    //   if (previous.default_price !== undefined) {
    //     updateData.plan_price_id = product.default_price;
    //   }

    //   if (previous.description !== undefined) {
    //     updateData.plan_description = product.description;
    //   }

    //   // Always sync metadata
    //   updateData.plan_role_available = metadata.plan_role_available;
    //   updateData.plan_type = metadata.plan_type;
    //   updateData.plan_limit = metadata.plan_limit;

    //   await prisma.plan_table.upsert({
    //     where: { plan_id: product.id },
    //     update: updateData,
    //     create: {
    //       plan_id: product.id,
    //       plan_name: product.name,
    //       plan_photo: product.images[0],
    //       plan_description: product.description,
    //       plan_price_id: product.default_price as string,
    //       plan_role_available: metadata.plan_role_available,
    //       plan_type: metadata.plan_type,
    //       plan_limit: metadata.plan_limit,
    //       plan_is_active: true,
    //       plan_created_at: new Date(product.created * 1000),
    //     },
    //   });

    //   break;
    // }

    // case "product.deleted": {
    //   const product = event.data.object;

    //   await prisma.plan_table.update({
    //     where: { plan_id: product.id },
    //     data: {
    //       plan_is_active: false,
    //     },
    //   });

    //   break;
    // }

    case "payment_intent.succeeded": {
      console.log("[payment_intent.succeeded]", event);

      const payment = event.data.object as unknown as any;

      await prisma.subscription_table.update({
        where: {
          subscription_stripe_customer_id: payment.customer as string,
        },
        data: {
          subscription_status: payment.status,
          subscription_cancel_at_period_end: payment.cancel_at_period_end,
          subscription_seats: payment.items.data[0]?.quantity ?? 1,
          subscription_trial_start: new Date(
            (payment.period_start ?? 0) * 1000
          ),
          subscription_trial_end: new Date((payment.period_end ?? 0) * 1000),
        },
      });

      break;
    }

    case "customer.subscription.created": {
      console.log("[customer.subscription.created]", event);

      const subscription = event.data.object as unknown as any;

      await prisma.subscription_table.upsert({
        where: {
          subscription_stripe_customer_id: subscription.customer as string,
        },
        update: {
          subscription_plan: "dashboard",
          subscription_reference_id: subscription.metadata.referenceId ?? "",
          subscription_stripe_customer_id: subscription.customer as string,
          subscription_stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_period_start: new Date(),
          subscription_cancel_at_period_end: false,
          subscription_seats: subscription.items.data[0]?.quantity ?? 1,
        },
        create: {
          subscription_plan: "dashboard",
          subscription_reference_id: subscription.metadata.referenceId ?? "",
          subscription_stripe_customer_id: subscription.customer as string,
          subscription_stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_period_start: new Date(),
          subscription_cancel_at_period_end: false,
          subscription_seats: subscription.items.data[0]?.quantity ?? 1,
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as unknown as any;

      await prisma.subscription_table.update({
        where: {
          subscription_stripe_customer_id: sub.customer as string,
        },

        data: {
          subscription_status: sub.cancel_at !== null ? "canceled" : sub.status,
          subscription_cancel_at_period_end: sub.cancel_at_period_end ?? false,
          subscription_seats: sub.items.data[0]?.quantity ?? 1,
          subscription_trial_start: sub.trial_start
            ? new Date(sub.trial_start * 1000)
            : null,

          subscription_trial_end: sub.trial_end
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

      await prisma.subscription_table.update({
        where: {
          subscription_stripe_customer_id: subscription.customer as string,
        },
        data: {
          subscription_status: "canceled",

          subscription_period_end: subscription.ended_at
            ? new Date(subscription.ended_at * 1000)
            : null,

          subscription_cancel_at_period_end: canceledAtTrialEnd ? true : false,
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
      normalizeFieldName(field.field_name) === header
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
