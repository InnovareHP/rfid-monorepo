import type Stripe from "stripe";
import { stripe } from "./stripe";

// Checkout's subscription_data has no payment_settings, and the session-level
// payment_method_types only governs the first charge. Without this, renewal
// invoices fall back to the account default and an ACH payer silently becomes
// a card payer.
export const persistSubscriptionPaymentSettings = async ({
  stripeSubscription,
}: {
  stripeSubscription: Stripe.Subscription;
}) => {
  try {
    await stripe.subscriptions.update(stripeSubscription.id, {
      payment_settings: {
        payment_method_types: ["card", "us_bank_account"],
        save_default_payment_method: "on_subscription",
      },
    });
  } catch (error) {
    // Best effort: the subscription is already live, so a failure here must not
    // fail the checkout the customer just completed.
    console.error("[stripe] failed to persist payment settings", error);
  }
};
