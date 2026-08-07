import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type BookingRescheduledEmailProps = {
  recipientName: string;
  liaisonName: string;
  facility: string;
  originalDateTime: string;
  newDateTime: string;
  bookingUrl: string;
};

export const BookingRescheduledEmail = ({
  recipientName,
  liaisonName,
  facility,
  originalDateTime,
  newDateTime,
  bookingUrl,
}: BookingRescheduledEmailProps) => (
  <EmailLayout
    preview={`Booking at ${facility} moved to ${newDateTime}`}
    badge="Booking Rescheduled"
  >
    <Heading style={emailStyles.heading}>
      A booking has been rescheduled
    </Heading>

    <Text style={emailStyles.paragraph}>
      Hi <strong>{recipientName}</strong>, the booking below has moved to a new
      date and time.
    </Text>

    <EmailDetailTable
      rows={[
        { label: "Liaison", value: liaisonName },
        { label: "Facility", value: facility },
        { label: "Original Date and Time", value: originalDateTime },
        { label: "New Date and Time", value: newDateTime },
      ]}
    />

    <EmailCta href={bookingUrl} label="View Updated Booking" />
  </EmailLayout>
);

export default BookingRescheduledEmail;
