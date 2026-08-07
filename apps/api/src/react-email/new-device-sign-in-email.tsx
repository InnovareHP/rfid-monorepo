import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

interface NewDeviceSignInEmailProps {
  deviceLabel: string;
  signedInAt: string;
  settingsUrl: string;
}

export const NewDeviceSignInEmail = ({
  deviceLabel,
  signedInAt,
  settingsUrl,
}: NewDeviceSignInEmailProps) => {
  return (
    <EmailLayout preview="New sign-in to your account">
      <Text style={emailStyles.eyebrow}>Security alert</Text>

      <Heading style={emailStyles.heading}>New sign-in detected</Heading>

      <Text style={emailStyles.paragraph}>
        Your passkey was used to sign in from a device we have not seen before.
      </Text>

      <Section style={emailStyles.detailBox}>
        <Text style={emailStyles.detailText}>
          Device: <strong>{deviceLabel}</strong>
          <br />
          Signed in: <strong>{signedInAt}</strong>
        </Text>
      </Section>

      <Text style={emailStyles.paragraph}>
        If this was you, no action is needed. If it was not, review your signed
        in places and registered passkeys, then remove anything you do not
        recognise.
      </Text>

      <Section style={emailStyles.buttonWrapper}>
        <Button href={settingsUrl} style={emailStyles.button}>
          Review security settings
        </Button>
      </Section>
    </EmailLayout>
  );
};

export default NewDeviceSignInEmail;
