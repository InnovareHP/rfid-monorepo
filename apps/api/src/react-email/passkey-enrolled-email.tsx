import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

interface PasskeyEnrolledEmailProps {
  memberEmail: string;
  organizationName: string;
  deviceLabel: string;
  deviceCount: number;
  enrolledAt: string;
}

export const PasskeyEnrolledEmail = ({
  memberEmail,
  organizationName,
  deviceLabel,
  deviceCount,
  enrolledAt,
}: PasskeyEnrolledEmailProps) => {
  return (
    <EmailLayout preview={`New passkey registered for ${memberEmail}`}>
      <Heading style={emailStyles.heading}>A new passkey was added</Heading>

      <Text style={emailStyles.paragraph}>
        <strong>{memberEmail}</strong> registered a new passkey on{" "}
        <strong>{organizationName}</strong>.
      </Text>

      <Text style={emailStyles.paragraph}>
        Device: <strong>{deviceLabel}</strong>
        <br />
        Registered: {enrolledAt}
        <br />
        Passkeys on this account: <strong>{deviceCount}</strong>
      </Text>

      <Text style={emailStyles.paragraph}>
        If this member did not add a device, reset their passkeys from Settings
        then Team and ask them to enroll again.
      </Text>
    </EmailLayout>
  );
};

export default PasskeyEnrolledEmail;
