import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type OwnershipTransferEmailProps = {
  recipientName: string;
  organizationName: string;
  previousOwner: string;
  newOwner: string;
  transferredOn: string;
  settingsUrl: string;
};

export const OwnershipTransferEmail = ({
  recipientName,
  organizationName,
  previousOwner,
  newOwner,
  transferredOn,
  settingsUrl,
}: OwnershipTransferEmailProps) => (
  <EmailLayout
    preview={`Ownership of ${organizationName} has been transferred`}
    badge="Ownership Transfer"
  >
    <Heading style={emailStyles.heading}>Account ownership has changed</Heading>

    <Text style={emailStyles.paragraph}>
      Hi <strong>{recipientName}</strong>, ownership of the{" "}
      <strong>{organizationName}</strong> account on Refidly has been
      transferred.
    </Text>

    <EmailDetailTable
      rows={[
        { label: "Previous Owner", value: previousOwner },
        { label: "New Owner", value: newOwner },
        { label: "Transferred On", value: transferredOn },
      ]}
    />

    <EmailCta href={settingsUrl} label="View Account Settings" />

    <Text style={emailStyles.muted}>
      If you didn&apos;t expect this change, contact your organization admin or
      Refidly Support right away.
    </Text>
  </EmailLayout>
);

export default OwnershipTransferEmail;
