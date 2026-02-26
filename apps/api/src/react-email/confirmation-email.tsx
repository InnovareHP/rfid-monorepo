import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

type ReferralDashboardEmailProps = {
  magicLink: string;
  name?: string;
};

export const ReferralDashboardEmail = ({
  magicLink,
  name = "there",
}: ReferralDashboardEmailProps) => {
  return (
    <EmailLayout preview="Verify your account">
      <Heading style={emailStyles.heading}>Verify your account!</Heading>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>
        Welcome! To complete your registration and verify your email address,
        please click the button below:
      </Text>

      <Section style={{ textAlign: "start", margin: "24px 0" }}>
        <Button href={magicLink} style={emailStyles.button}>
          Verify Email
        </Button>
      </Section>

      <Text style={emailStyles.paragraph}>
        This link will expire in 10 minutes for your security.
      </Text>
    </EmailLayout>
  );
};

export default ReferralDashboardEmail;
