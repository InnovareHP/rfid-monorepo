import { Heading, Section, Text } from "@react-email/components";
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
      <Text style={emailStyles.eyebrow}>Security alert</Text>

      <Heading style={emailStyles.heading}>A new passkey was added</Heading>

      <Text style={emailStyles.paragraph}>
        <strong>{memberEmail}</strong> registered a new passkey on{" "}
        <strong>{organizationName}</strong>.
      </Text>

      <Section style={emailStyles.detailBox}>
        <Text style={emailStyles.detailText}>
          Device: <strong>{deviceLabel}</strong>
          <br />
          Registered: <strong>{enrolledAt}</strong>
          <br />
          Passkeys on this account: <strong>{deviceCount}</strong>
        </Text>
      </Section>

      <Text style={emailStyles.muted}>
        If this member did not add a device, reset their passkeys from Settings
        then Team and ask them to enroll again.
      </Text>
    </EmailLayout>
  );
};

export default PasskeyEnrolledEmail;
