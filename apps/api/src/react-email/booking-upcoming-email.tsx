import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { BRAND_NAME, EmailLayout, emailStyles } from "./email-layout";

type BookingUpcomingEmailProps = {
  recipientName: string;
  title: string;
  startTime: string;
  locationLabel?: string | null;
  meetingUrl?: string | null;
  manageUrl: string;
};

// The day-before nudge. Distinct from booking-reminder-email.tsx, which is
// modelled on liaison facility visits rather than booking pages.
export const BookingUpcomingEmail = ({
  recipientName,
  title,
  startTime,
  locationLabel,
  meetingUrl,
  manageUrl,
}: BookingUpcomingEmailProps) => (
  <EmailLayout preview={`${title} is coming up`}>
    <Text style={emailStyles.eyebrow}>Coming up</Text>

    <Heading style={emailStyles.heading}>{title}</Heading>

    <Text style={emailStyles.paragraph}>Hi {recipientName},</Text>

    <Text style={emailStyles.paragraph}>
      This is a reminder about your upcoming session.
    </Text>

    <Section style={emailStyles.detailBox}>
      <Text style={emailStyles.detailText}>
        When: <strong>{startTime}</strong>
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

    <Text style={emailStyles.paragraph}>
      Can no longer make it? <a href={manageUrl}>Reschedule or cancel</a>.
    </Text>

    <Text style={emailStyles.muted}>
      Best regards,
      <br />
      The {BRAND_NAME} team
    </Text>
  </EmailLayout>
);

export default BookingUpcomingEmail;
