import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

interface InvitationResponseEmailProps {
  inviterName: string;
  inviteeEmail: string;
  organizationName: string;
  response: "accepted" | "declined";
  role?: string;
}

export const InvitationResponseEmail = ({
  inviterName,
  inviteeEmail,
  organizationName,
  response,
  role,
}: InvitationResponseEmailProps) => {
  const accepted = response === "accepted";

  return (
    <EmailLayout
      preview={`${inviteeEmail} ${response} your invitation to ${organizationName}`}
    >
      <Heading style={emailStyles.heading}>
        Invitation {accepted ? "accepted" : "declined"}
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hi {inviterName},
        <br />
        <strong>{inviteeEmail}</strong> has {response} your invitation to join{" "}
        <strong>{organizationName}</strong>
        {accepted && role ? (
          <>
            {" "}
            as <strong>{role}</strong>
          </>
        ) : null}
        .
      </Text>

      {!accepted && (
        <Text style={emailStyles.paragraph}>
          You can send a new invitation from your team settings at any time.
        </Text>
      )}
    </EmailLayout>
  );
};

export default InvitationResponseEmail;
