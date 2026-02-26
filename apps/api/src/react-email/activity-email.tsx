import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

type ActivityEmailProps = {
  recipientName: string;
  body: string;
};

export const ActivityEmail = ({ recipientName, body }: ActivityEmailProps) => {
  return (
    <EmailLayout preview="You have new activity">
      <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>

      <Text style={emailStyles.paragraph}>{body}</Text>

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The {process.env.APP_NAME ?? "Dashboard"} Team
      </Text>
    </EmailLayout>
  );
};

export default ActivityEmail;
