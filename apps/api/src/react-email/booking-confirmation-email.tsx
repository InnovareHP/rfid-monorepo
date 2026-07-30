import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

type BookingConfirmationEmailProps = {
  recipientName: string;
  title: string;
  startTime: string;
  hostName: string;
  locationLabel?: string | null;
};

export const BookingConfirmationEmail = ({
  recipientName,
  title,
  startTime,
  hostName,
  locationLabel,
}: BookingConfirmationEmailProps) => {
  return (
    <EmailLayout preview={`Your booking for ${title} is confirmed`}>
      <Text style={emailStyles.heading}>Booking Confirmed</Text>

      <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>

      <Text style={emailStyles.paragraph}>
        Your booking &quot;{title}&quot; with {hostName} is confirmed for{" "}
        {startTime}.
      </Text>

      {locationLabel && (
        <Text style={emailStyles.paragraph}>Location: {locationLabel}</Text>
      )}

      <Text style={emailStyles.paragraph}>
        Best regards,
        <br />
        The {process.env.APP_NAME ?? "Dashboard"} Team
      </Text>
    </EmailLayout>
  );
};

export default BookingConfirmationEmail;
