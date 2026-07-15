import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

interface MemberWelcomeEmailProps {
  email: string;
  organizationName: string;
  role: string;
  loginUrl: string;
}

export const MemberWelcomeEmail = ({
  email,
  organizationName,
  role,
  loginUrl,
}: MemberWelcomeEmailProps) => {
  return (
    <EmailLayout preview={`Welcome to ${organizationName}`}>
      <Heading style={emailStyles.heading}>Welcome aboard!</Heading>

      <Text style={emailStyles.paragraph}>
        Hi {email},
        <br />
        You have been added to <strong>{organizationName}</strong> as{" "}
        <strong>{role}</strong>.
      </Text>

      <Section style={{ textAlign: "start", margin: "24px 0" }}>
        <Button href={loginUrl} style={emailStyles.button}>
          Go to Dashboard
        </Button>
      </Section>

      <Text style={emailStyles.paragraph}>
        If you were not expecting this, please contact your organization
        administrator.
      </Text>
    </EmailLayout>
  );
};

export default MemberWelcomeEmail;
