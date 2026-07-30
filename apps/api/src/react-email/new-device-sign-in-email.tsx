import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, emailStyles } from "./email-layout";

interface NewDeviceSignInEmailProps {
  deviceLabel: string;
  signedInAt: string;
  settingsUrl: string;
}

export const NewDeviceSignInEmail = ({
  deviceLabel,
  signedInAt,
  settingsUrl,
}: NewDeviceSignInEmailProps) => {
  return (
    <EmailLayout preview="New sign-in to your account">
      <Heading style={emailStyles.heading}>New sign-in detected</Heading>

      <Text style={emailStyles.paragraph}>
        Your passkey was used to sign in from a device we have not seen before.
      </Text>

      <Text style={emailStyles.paragraph}>
        Device: <strong>{deviceLabel}</strong>
        <br />
        Signed in: {signedInAt}
      </Text>

      <Text style={emailStyles.paragraph}>
        If this was you, no action is needed. If it was not, review your signed
        in places and registered passkeys at {settingsUrl} and remove anything
        you do not recognise.
      </Text>
    </EmailLayout>
  );
};

export default NewDeviceSignInEmail;
