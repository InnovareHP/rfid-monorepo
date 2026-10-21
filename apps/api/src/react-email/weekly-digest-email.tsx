import { Heading, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailCta, EmailDetailTable } from "./email-detail-table";
import { EmailLayout, emailStyles } from "./email-layout";

export type DigestModuleRow = {
  label: string;
  thisWeek: number;
  lastWeek: number;
};

type WeeklyDigestEmailProps = {
  recipientName: string;
  organizationName: string;
  modules: DigestModuleRow[];
  overdue: number;
  inactive: { count: number; total: number } | null;
  ctaUrl: string;
  unsubscribeUrl: string;
};

// Counts only: no record names or field values, so nothing here is PHI.
export const WeeklyDigestEmail = ({
  recipientName,
  organizationName,
  modules,
  overdue,
  inactive,
  ctaUrl,
  unsubscribeUrl,
}: WeeklyDigestEmailProps) => (
  <EmailLayout preview={`Your week at ${organizationName}`} badge="Weekly Digest">
    <Heading style={emailStyles.heading}>
      Your week at {organizationName}
    </Heading>

    <Text style={emailStyles.paragraph}>
      Hi <strong>{recipientName}</strong>, here is what moved in the last 7
      days.
    </Text>

    {modules.length > 0 && (
      <EmailDetailTable
        rows={modules.map((module) => ({
          label: module.label,
          value: `${module.thisWeek} added (${module.lastWeek} the week before)`,
        }))}
      />
    )}

    {overdue > 0 && (
      <Text style={emailStyles.paragraph}>
        You have <strong>{overdue}</strong> overdue follow-up
        {overdue === 1 ? "" : "s"} waiting.
      </Text>
    )}

    {inactive && (
      <Text style={emailStyles.paragraph}>
        <strong>
          {inactive.count} of {inactive.total}
        </strong>{" "}
        teammates have not used the app in 14+ days. A quick nudge gets them
        back on their follow-ups.
      </Text>
    )}

    <EmailCta
      href={ctaUrl}
      label={overdue > 0 ? "Open follow-ups" : "Open dashboard"}
    />

    <Text style={emailStyles.paragraph}>
      <Link href={unsubscribeUrl}>Unsubscribe from the weekly digest</Link>
    </Text>
  </EmailLayout>
);

export default WeeklyDigestEmail;
