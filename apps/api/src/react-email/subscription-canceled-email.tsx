import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable, type DetailRow } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type SubscriptionCanceledEmailProps = {
  recipientName: string;
  organizationName: string;
  planLabel: string;
  accessUntil: string;
  canceledBy?: string | null;
  billingUrl: string;
};

export const SubscriptionCanceledEmail = ({
  recipientName,
  organizationName,
  planLabel,
  accessUntil,
  canceledBy,
  billingUrl,
}: SubscriptionCanceledEmailProps) => {
  const rows: DetailRow[] = [
    { label: "Plan", value: planLabel },
    { label: "Access Until", value: accessUntil },
  ];

  if (canceledBy) rows.push({ label: "Canceled By", value: canceledBy });

  return (
    <EmailLayout
      preview={`Subscription canceled for ${organizationName}`}
      badge="Subscription Canceled"
    >
      <Heading style={emailStyles.heading}>
        Your subscription has been canceled
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hi <strong>{recipientName}</strong>, we&apos;ve canceled the Refidly
        subscription for <strong>{organizationName}</strong> as requested.
        You&apos;ll keep access until the end of your current billing period.
      </Text>

      <EmailDetailTable rows={rows} />

      <EmailCta href={billingUrl} label="Reactivate Subscription" />
    </EmailLayout>
  );
};

export default SubscriptionCanceledEmail;
