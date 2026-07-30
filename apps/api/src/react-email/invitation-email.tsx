import { Button, Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

interface InvitationEmailProps {
  invitation: {
    email: string;
    organizationName: string;
    inviterName: string;
    inviteLink: string;
    rejectLink?: string;
  };
}

export const InvitationEmail = ({ invitation }: InvitationEmailProps) => {
  return (
    <EmailLayout
      preview={`You're invited to join ${invitation.organizationName}`}
    >
      <Text style={emailStyles.eyebrow}>Team invitation</Text>

      <Heading style={emailStyles.heading}>
        Join {invitation.organizationName}
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hi {invitation.email},
        <br />
        {invitation.inviterName} has invited you to join{" "}
        <strong>{invitation.organizationName}</strong>.
      </Text>

      <Section style={emailStyles.buttonWrapper}>
        <Button href={invitation.inviteLink} style={emailStyles.button}>
          Accept invitation
        </Button>
      </Section>

      {invitation.rejectLink && (
        <Text style={emailStyles.paragraph}>
          Don&apos;t want to join?{" "}
          <Link href={invitation.rejectLink} style={emailStyles.link}>
            Reject this invitation
          </Link>
        </Text>
      )}

      <Text style={emailStyles.muted}>
        If you did not expect this invitation, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
};

export default InvitationEmail;
