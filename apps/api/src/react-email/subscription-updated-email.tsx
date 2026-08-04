import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable, type DetailRow } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type SubscriptionUpdatedEmailProps = {
  recipientName: string;
  organizationName: string;
  previousPlan?: string | null;
  newPlan: string;
  billingAmount: string;
  effectiveOn: string;
  billingUrl: string;
};

export const SubscriptionUpdatedEmail = ({
  recipientName,
  organizationName,
  previousPlan,
  newPlan,
  billingAmount,
  effectiveOn,
  billingUrl,
}: SubscriptionUpdatedEmailProps) => {
  const rows: DetailRow[] = [];

  if (previousPlan) rows.push({ label: "Previous Plan", value: previousPlan });
  rows.push(
    { label: "New Plan", value: newPlan },
    { label: "Billing Amount", value: billingAmount },
    { label: "Effective On", value: effectiveOn }
  );

  return (
    <EmailLayout
      preview={`Subscription updated for ${organizationName}`}
      badge="Subscription Updated"
    >
      <Heading style={emailStyles.heading}>
        Your subscription has been updated
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hi <strong>{recipientName}</strong>, here&apos;s a summary of the recent
        change to your Refidly subscription for{" "}
        <strong>{organizationName}</strong>.
      </Text>

      <EmailDetailTable rows={rows} />

      <EmailCta href={billingUrl} label="View Billing Details" />
    </EmailLayout>
  );
};

export default SubscriptionUpdatedEmail;
