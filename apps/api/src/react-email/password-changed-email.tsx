import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

type PasswordChangedEmailProps = {
  resetUrl: string;
  name?: string;
};

// Sent after the change lands, not before: its job is to reach someone whose
// password was reset without them.
export const PasswordChangedEmail = ({
  resetUrl,
  name = "there",
}: PasswordChangedEmailProps) => {
  return (
    <EmailLayout preview="Your password was changed">
      <Text style={emailStyles.eyebrow}>Security alert</Text>

      <Heading style={emailStyles.heading}>Your password was changed</Heading>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>
        Your password was just changed, and every other signed in session was
        signed out. If this was you, nothing else is needed.
      </Text>

      <Text style={emailStyles.paragraph}>
        If it was not you, set a new password now to lock the account back down.
      </Text>

      <Section style={emailStyles.buttonWrapper}>
        <Button href={resetUrl} style={emailStyles.button}>
          Set a new password
        </Button>
      </Section>

      <Text style={emailStyles.muted}>
        Still locked out after resetting? Reach us through the support link
        below.
      </Text>
    </EmailLayout>
  );
};

export default PasswordChangedEmail;
