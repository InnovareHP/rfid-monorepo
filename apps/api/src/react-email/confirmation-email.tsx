import { Button, Heading, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

type ReferralDashboardEmailProps = {
  magicLink: string;
  name?: string;
  logoUrl: string;
};

export const ReferralDashboardEmail = ({
  magicLink,
  name = "there",
  logoUrl,
}: ReferralDashboardEmailProps) => {
  return (
    <EmailLayout preview="Verify your account">
      <Section style={heroSection}>
        <Img
          src={logoUrl}
          alt="Innovare HP Referral Intelligence Dashboard"
          style={logo}
        />
      </Section>

      <Heading style={emailStyles.heading}>
        Innovare HP Referral Intelligence Dashboard
      </Heading>

      <Text style={emailStyles.paragraph}>Hi {name},</Text>

      <Text style={emailStyles.paragraph}>
        Welcome! To complete your registration and verify your email address,
        please click the button below:
      </Text>

      <Section style={buttonSection}>
        <Button href={magicLink} style={verifyButton}>
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

const heroSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "8px",
};

const logo: React.CSSProperties = {
  width: "100%",
  maxWidth: "340px",
  height: "auto",
  margin: "0 auto",
};

const buttonSection: React.CSSProperties = {
  textAlign: "start",
  margin: "24px 0",
};

const verifyButton: React.CSSProperties = {
  ...emailStyles.button,
  backgroundColor: "#155dfc",
};
