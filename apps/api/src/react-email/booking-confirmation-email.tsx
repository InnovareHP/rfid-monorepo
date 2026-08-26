import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { BRAND_NAME, EmailLayout, emailStyles } from "./email-layout";

type BookingConfirmationEmailProps = {
  recipientName: string;
  title: string;
  startTime: string;
  hostName: string;
  locationLabel?: string | null;
  meetingUrl?: string | null;
  // Invitee copies only. The host manages bookings from the dashboard.
  manageUrl?: string | null;
};

export const BookingConfirmationEmail = ({
  recipientName,
  title,
  startTime,
  hostName,
  locationLabel,
  meetingUrl,
  manageUrl,
}: BookingConfirmationEmailProps) => {
  return (
    <EmailLayout preview={`Your booking for ${title} is confirmed`}>
      <Text style={emailStyles.eyebrow}>Booking confirmed</Text>

      <Heading style={emailStyles.heading}>{title}</Heading>

      <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>

      <Text style={emailStyles.paragraph}>
        Your booking with {hostName} is confirmed. Details are below.
      </Text>

      <Section style={emailStyles.detailBox}>
        <Text style={emailStyles.detailText}>
          When: <strong>{startTime}</strong>
          <br />
          Host: <strong>{hostName}</strong>
          {locationLabel ? (
            <>
              <br />
              Location: <strong>{locationLabel}</strong>
            </>
          ) : null}
          {meetingUrl ? (
            <>
              <br />
              Join: <a href={meetingUrl}>{meetingUrl}</a>
            </>
          ) : null}
        </Text>
      </Section>

      {manageUrl ? (
        <Text style={emailStyles.paragraph}>
          Need a different time?{" "}
          <a href={manageUrl}>Reschedule or cancel</a>.
        </Text>
      ) : null}

      <Text style={emailStyles.muted}>
        Best regards,
        <br />
        The {BRAND_NAME} team
      </Text>
    </EmailLayout>
  );
};

export default BookingConfirmationEmail;
