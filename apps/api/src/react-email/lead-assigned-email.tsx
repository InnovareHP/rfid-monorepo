import { Heading, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailCta,
  EmailDetailTable,
  type DetailRow,
} from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

type LeadAssignedEmailProps = {
  recipientName: string;
  assignerName: string;
  facilityName: string;
  contactPerson?: string | null;
  phone?: string | null;
  county?: string | null;
  leadUrl: string;
};

export const LeadAssignedEmail = ({
  recipientName,
  assignerName,
  facilityName,
  contactPerson,
  phone,
  county,
  leadUrl,
}: LeadAssignedEmailProps) => {
  const rows: DetailRow[] = [{ label: "Facility Name", value: facilityName }];

  if (contactPerson)
    rows.push({ label: "Contact Person", value: contactPerson });
  if (phone) rows.push({ label: "Phone", value: phone });
  if (county) rows.push({ label: "County", value: county });

  return (
    <EmailLayout
      preview={`${assignerName} assigned you ${facilityName}`}
      badge="New Lead"
    >
      <Heading style={emailStyles.heading}>
        A new lead has been assigned to you
      </Heading>

      <Text style={emailStyles.paragraph}>
        Hi <strong>{recipientName}</strong>, <strong>{assignerName}</strong>{" "}
        assigned you a new lead. Reach out while it&apos;s fresh.
      </Text>

      <EmailDetailTable rows={rows} />

      <EmailCta href={leadUrl} label="View Lead" />
    </EmailLayout>
  );
};

export default LeadAssignedEmail;
