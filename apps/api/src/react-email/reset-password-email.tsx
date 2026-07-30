import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

type ResetPasswordEmail = {
  magicLink: string;
  name?: string;
};

export const ResetPasswordEmail = ({
  magicLink,
  name = "there",
}: ResetPasswordEmail) => {
  return (
    <EmailLayout preview="Reset your password">
      <Text style={emailStyles.eyebrow}>Account security</Text>

      <Heading style={emailStyles.heading}>Reset your password</Heading>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>
        Click the button below to securely reset your password.
      </Text>

      <Section style={emailStyles.buttonWrapper}>
        <Button href={magicLink} style={emailStyles.button}>
          Reset my password
        </Button>
      </Section>

      <Text style={emailStyles.muted}>
        This link expires in 10 minutes. If you did not request a reset, you can
        safely ignore this email.
      </Text>
    </EmailLayout>
  );
};

export default ResetPasswordEmail;
