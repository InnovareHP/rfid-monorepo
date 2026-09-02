import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { BRAND_NAME, EmailLayout, emailStyles } from "./email-layout";

type DemoRequestReceivedEmailProps = {
  recipientName: string;
};

// Sent only when online scheduling was unavailable, so the prospect is not left
// with a form that swallowed their request.
export const DemoRequestReceivedEmail = ({
  recipientName,
}: DemoRequestReceivedEmailProps) => (
  <EmailLayout preview={`We have your ${BRAND_NAME} demo request`}>
    <Text style={emailStyles.eyebrow}>Demo request received</Text>

    <Heading style={emailStyles.heading}>Thanks for getting in touch</Heading>

    <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>

    <Text style={emailStyles.paragraph}>
      We have your request for a {BRAND_NAME} demo. Online scheduling was not
      available just now, so someone from our team will email you shortly with
      times that work.
    </Text>

    <Text style={emailStyles.paragraph}>
      If anything has changed in the meantime, just reply to this message.
    </Text>

    <Text style={emailStyles.muted}>
      Best regards,
      <br />
      The {BRAND_NAME} team
    </Text>
  </EmailLayout>
);

export default DemoRequestReceivedEmail;
