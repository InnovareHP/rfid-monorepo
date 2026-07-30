import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

export const OtpEmail = ({ validationCode }: { validationCode: string }) => (
  <EmailLayout preview="Your verification code">
    <Text style={emailStyles.eyebrow}>Verification code</Text>

    <Heading style={emailStyles.heading}>Confirm your email address</Heading>

    <Text style={emailStyles.paragraph}>
      Enter the code below in your open browser window to finish signing in.
    </Text>

    <Section style={emailStyles.codeBox}>
      <Text style={emailStyles.codeText}>{validationCode}</Text>
    </Section>

    <Text style={emailStyles.muted}>
      If you did not request this code, you can safely ignore this email.
    </Text>
  </EmailLayout>
);

export default OtpEmail;
