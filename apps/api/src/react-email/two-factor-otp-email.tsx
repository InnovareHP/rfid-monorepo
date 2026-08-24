import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

export const TwoFactorOtpEmail = ({
  validationCode,
}: {
  validationCode: string;
}) => (
  <EmailLayout preview="Your two-factor authentication code">
    <Text style={emailStyles.eyebrow}>Two-factor authentication</Text>

    <Heading style={emailStyles.heading}>Your verification code</Heading>

    <Text style={emailStyles.paragraph}>
      Enter the code below in your open browser window to continue. It expires
      in 5 minutes.
    </Text>

    <Section style={emailStyles.codeBox}>
      <Text style={emailStyles.codeText}>{validationCode}</Text>
    </Section>

    <Text style={emailStyles.muted}>
      If you did not request this code, someone may have your password. Change
      it right away.
    </Text>
  </EmailLayout>
);

export default TwoFactorOtpEmail;
