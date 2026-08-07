import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable, type DetailRow } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type BookingCanceledEmailProps = {
  recipientName: string;
  referralName: string;
  facility: string;
  originalDateTime: string;
  canceledBy: string;
  reason?: string | null;
  bookingUrl: string;
};

export const BookingCanceledEmail = ({
  recipientName,
  referralName,
  facility,
  originalDateTime,
  canceledBy,
  reason,
  bookingUrl,
}: BookingCanceledEmailProps) => {
  const rows: DetailRow[] = [
    { label: "Referral / Patient", value: referralName },
    { label: "Facility", value: facility },
    { label: "Original Date and Time", value: originalDateTime },
    { label: "Canceled by", value: canceledBy },
  ];

  if (reason) rows.push({ label: "Reason", value: reason });

  return (
    <EmailLayout
      preview={`Booking for ${referralName} was canceled`}
      badge="Booking Canceled"
    >
      <Heading style={emailStyles.heading}>A booking has been canceled</Heading>

      <Text style={emailStyles.paragraph}>
        Hi <strong>{recipientName}</strong>, the booking below has been canceled
        and no longer appears on the schedule.
      </Text>

      <EmailDetailTable rows={rows} />

      <EmailCta href={bookingUrl} label="View on Refidly" />
    </EmailLayout>
  );
};

export default BookingCanceledEmail;
