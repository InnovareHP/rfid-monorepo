import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable, type DetailRow } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type BookingReminderEmailProps = {
  recipientName: string;
  liaisonName: string;
  facility: string;
  dateTime: string;
  location?: string | null;
  bookingUrl: string;
};

export const BookingReminderEmail = ({
  recipientName,
  liaisonName,
  facility,
  dateTime,
  location,
  bookingUrl,
}: BookingReminderEmailProps) => {
  const rows: DetailRow[] = [
    { label: "Liaison", value: liaisonName },
    { label: "Facility", value: facility },
    { label: "Date and Time", value: dateTime },
  ];

  if (location) rows.push({ label: "Location", value: location });

  return (
    <EmailLayout
      preview={`Upcoming booking at ${facility} on ${dateTime}`}
      badge="Booking Reminder"
    >
      <Heading style={emailStyles.heading}>Upcoming booking reminder</Heading>

      <Text style={emailStyles.paragraph}>
        Hi <strong>{recipientName}</strong>, this is a reminder about an
        upcoming booking on your schedule.
      </Text>

      <EmailDetailTable rows={rows} />

      <EmailCta href={bookingUrl} label="View Booking" />
    </EmailLayout>
  );
};

export default BookingReminderEmail;
