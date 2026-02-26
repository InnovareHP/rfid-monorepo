import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

export const OtpEmail = ({ validationCode }: { validationCode: string }) => (
  <EmailLayout preview="Your verification code">
    <Heading style={emailStyles.heading}>Confirm your email address</Heading>

    <Text style={emailStyles.paragraph}>
      Your confirmation code is below — enter it in your open browser window and
      we&apos;ll help you get signed in.
    </Text>

    <Section style={codeBox}>
      <Text style={codeText}>{validationCode}</Text>
    </Section>

    <Text style={emailStyles.paragraph}>
      If you didn&apos;t request this email, there&apos;s nothing to worry
      about, you can safely ignore it.
    </Text>
  </EmailLayout>
);

export default OtpEmail;

const codeBox: React.CSSProperties = {
  background: "#f5f4f5",
  borderRadius: "6px",
  marginBottom: "24px",
  padding: "32px 10px",
  textAlign: "center",
};

const codeText: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "700",
  textAlign: "center",
  letterSpacing: "4px",
  color: "#18181b",
  margin: "0",
};
