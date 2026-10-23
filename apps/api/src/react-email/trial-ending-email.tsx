import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type TrialEndingEmailProps = {
  recipientName: string;
  organizationName: string;
  daysRemaining: number;
  planLabel: string;
  trialEndDate: string;
  seats: number;
  billingUrl: string;
};

export const dayCount = (days: number) =>
  `${days} ${days === 1 ? "day" : "days"}`;

export const TrialEndingEmail = ({
  recipientName,
  organizationName,
  daysRemaining,
  planLabel,
  trialEndDate,
  seats,
  billingUrl,
}: TrialEndingEmailProps) => (
  <EmailLayout
    preview={`Your Refidly trial ends in ${dayCount(daysRemaining)}`}
    badge="Trial Ending"
  >
    <Heading style={emailStyles.heading}>
      Your trial ends in {dayCount(daysRemaining)}
    </Heading>

    <Text style={emailStyles.paragraph}>
      Hi <strong>{recipientName}</strong>, your Refidly trial for{" "}
      <strong>{organizationName}</strong> ends on{" "}
      <strong>{trialEndDate}</strong>. Add a payment method to keep your
      team&apos;s tasks, referrals, and facilities without interruption.
    </Text>

    <EmailDetailTable
      rows={[
        { label: "Plan", value: planLabel },
        { label: "Trial End Date", value: trialEndDate },
        { label: "No. of Users", value: String(seats) },
      ]}
    />

    <EmailCta href={billingUrl} label="Upgrade Your Plan" />
  </EmailLayout>
);

export default TrialEndingEmail;
