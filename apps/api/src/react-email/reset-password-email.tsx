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
      <Heading style={emailStyles.heading}>Reset your password</Heading>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>
        Click the button below to securely reset your password.
      </Text>

      <Section style={{ textAlign: "start", margin: "24px 0" }}>
        <Button href={magicLink} style={emailStyles.button}>
          Reset My Password
        </Button>
      </Section>

      <Text style={emailStyles.paragraph}>
        This link will expire in 10 minutes for your security.
      </Text>
    </EmailLayout>
  );
};

export default ResetPasswordEmail;
