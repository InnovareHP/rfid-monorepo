import { Text } from "@react-email/components";
import * as React from "react";
import { EmailBranding, EmailLayout, emailStyles } from "./email-layout";

type ActivityEmailProps = {
  preview: string;
  recipientName: string;
  body: string;
  senderName: string;
  branding: EmailBranding;
};

export const ActivityEmail = ({
  preview,
  recipientName,
  body,
  senderName,
  branding,
}: ActivityEmailProps) => {
  return (
    <EmailLayout preview={preview} branding={branding}>
      <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>

      {/* Composed bodies carry markup, so they render as HTML rather than
          being escaped into visible tags. Sanitized by the caller. */}
      <div
        style={emailStyles.paragraph}
        dangerouslySetInnerHTML={{ __html: body }}
      />

      <Text style={emailStyles.muted}>
        Best regards,
        <br />
        {senderName}
        <br />
        {branding.name}
      </Text>
    </EmailLayout>
  );
};

export default ActivityEmail;
