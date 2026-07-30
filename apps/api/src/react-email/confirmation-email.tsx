import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { BRAND_NAME, EmailLayout, emailStyles } from "./email-layout";

type ConfirmationEmailProps = {
  magicLink: string;
  name?: string;
};

export const ReferralDashboardEmail = ({
  magicLink,
  name = "there",
}: ConfirmationEmailProps) => {
  return (
    <EmailLayout preview="Verify your account">
      <Text style={emailStyles.eyebrow}>Verify your account</Text>

      <Heading style={emailStyles.heading}>Welcome to {BRAND_NAME}</Heading>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>
        Confirm your email address to finish setting up your account.
      </Text>

      <Section style={emailStyles.buttonWrapper}>
        <Button href={magicLink} style={emailStyles.button}>
          Verify email
        </Button>
      </Section>

      <Text style={emailStyles.muted}>
        This link expires in 10 minutes for your security.
      </Text>
    </EmailLayout>
  );
};

export default ReferralDashboardEmail;
