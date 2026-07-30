import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

export type InvoiceEmailKind = "paid" | "failed" | "upcoming";

interface InvoiceEmailProps {
  kind: InvoiceEmailKind;
  organizationName: string;
  planLabel: string;
  seats: number;
  amount: string;
  invoiceUrl?: string | null;
  nextAttempt?: string | null;
}

const COPY: Record<InvoiceEmailKind, { heading: string; body: string }> = {
  paid: {
    heading: "Payment received",
    body: "Thanks — your subscription is paid and active.",
  },
  failed: {
    heading: "Payment failed",
    body: "We could not collect payment for your subscription.",
  },
  upcoming: {
    heading: "Upcoming renewal",
    body: "Your subscription renews soon. No action is needed if your payment details are current.",
  },
};

export const InvoiceEmail = ({
  kind,
  organizationName,
  planLabel,
  seats,
  amount,
  invoiceUrl,
  nextAttempt,
}: InvoiceEmailProps) => {
  const copy = COPY[kind];

  return (
    <EmailLayout preview={`${copy.heading} for ${organizationName}`}>
      <Heading style={emailStyles.heading}>{copy.heading}</Heading>

      <Text style={emailStyles.paragraph}>{copy.body}</Text>

      <Text style={emailStyles.paragraph}>
        Organization: <strong>{organizationName}</strong>
        <br />
        Plan: <strong>{planLabel}</strong>
        <br />
        Seats: <strong>{seats}</strong>
        <br />
        Amount: <strong>{amount}</strong>
        {nextAttempt ? (
          <>
            <br />
            Next attempt: {nextAttempt}
          </>
        ) : null}
      </Text>

      {invoiceUrl ? (
        <Section style={{ textAlign: "start", margin: "24px 0" }}>
          <Button href={invoiceUrl} style={emailStyles.button}>
            View invoice
          </Button>
        </Section>
      ) : null}
    </EmailLayout>
  );
};

export default InvoiceEmail;
