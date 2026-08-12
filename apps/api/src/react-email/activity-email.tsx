import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { BRAND_NAME, EmailLayout, emailStyles } from "./email-layout";

type ActivityEmailProps = {
  recipientName: string;
  body: string;
};

export const ActivityEmail = ({ recipientName, body }: ActivityEmailProps) => {
  return (
    <EmailLayout preview="You have new activity">
      <Text style={emailStyles.eyebrow}>New activity</Text>

      <Heading style={emailStyles.heading}>Here is what changed</Heading>

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
        The {BRAND_NAME} team
      </Text>
    </EmailLayout>
  );
};

export default ActivityEmail;
