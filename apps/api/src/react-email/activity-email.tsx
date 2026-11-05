import * as React from "react";
import { EmailBranding, EmailLayout, emailStyles } from "./email-layout";

type ActivityEmailProps = {
  preview: string;
  body: string;
  branding: EmailBranding;
};

// The composer writes the whole message, greeting and sign-off included.
export const ActivityEmail = ({
  preview,
  body,
  branding,
}: ActivityEmailProps) => {
  return (
    <EmailLayout preview={preview} branding={branding}>
      {/* Composed bodies carry markup, so they render as HTML rather than
          being escaped into visible tags. Sanitized by the caller. */}
      <div
        style={emailStyles.paragraph}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </EmailLayout>
  );
};

export default ActivityEmail;
