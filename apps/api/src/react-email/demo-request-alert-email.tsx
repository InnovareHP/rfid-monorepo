import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

type DemoRequestAlertEmailProps = {
  name: string;
  email: string;
  company?: string | null;
  teamSize?: string | null;
  notes?: string | null;
  reason: string;
};

// Internal only. Sent when a demo request arrives that the scheduler could not
// place, so it needs a human before the lead goes cold.
export const DemoRequestAlertEmail = ({
  name,
  email,
  company,
  teamSize,
  notes,
  reason,
}: DemoRequestAlertEmailProps) => (
  <EmailLayout preview={`Demo request from ${name} needs scheduling`}>
    <Text style={emailStyles.eyebrow}>Action needed</Text>

    <Heading style={emailStyles.heading}>Demo request needs scheduling</Heading>

    <Text style={emailStyles.paragraph}>{reason}</Text>

    <Section style={emailStyles.detailBox}>
      <Text style={emailStyles.detailText}>
        Name: <strong>{name}</strong>
        <br />
        Email: <strong>{email}</strong>
        {company ? (
          <>
            <br />
            Organization: <strong>{company}</strong>
          </>
        ) : null}
        {teamSize ? (
          <>
            <br />
            Team size: <strong>{teamSize}</strong>
          </>
        ) : null}
        {notes ? (
          <>
            <br />
            Notes: <strong>{notes}</strong>
          </>
        ) : null}
      </Text>
    </Section>
  </EmailLayout>
);

export default DemoRequestAlertEmail;
