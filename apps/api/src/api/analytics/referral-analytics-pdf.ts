import type { AnalyticsResponse } from "@dashboard/shared";
import {
  breakdownTable,
  createReport,
  longDate,
  num,
  percent,
  periodLabel,
  rate,
} from "../../lib/documents/report-pdf";

// The dashboard's charts are the same counts drawn as bars and slices, so the
// document prints the numbers behind them rather than a picture of the screen.
const named = (rows: { value: string | null; _count: { value: number } }[]) =>
  rows.map((row) => ({
    name: row.value ?? "Not set",
    count: row._count.value,
  }));

export const renderReferralAnalyticsPdf = async (input: {
  organizationName: string;
  report: AnalyticsResponse;
  startDate?: Date;
  endDate?: Date;
  scope: string;
}): Promise<Buffer> => {
  const report = createReport({
    title: "Referral Analytics Report",
    organizationName: input.organizationName,
    meta: [
      { label: "Period", value: periodLabel(input.startDate, input.endDate) },
      { label: "Scope", value: input.scope },
      { label: "Generated", value: longDate(new Date()) },
    ],
  });

  const { totalCounts, conversion, denials } = input.report;

  report.sectionTitle("Summary");
  report.statBand([
    { label: "Referrals", value: num(totalCounts.totalReferrals) },
    { label: "Facilities", value: num(totalCounts.totalLeads) },
    { label: "Admitted", value: num(conversion.admitted) },
    { label: "Conversion", value: percent(conversion.conversionRate) },
  ]);
  report.note(
    `${num(totalCounts.referralsThisPeriod)} referrals and ${num(
      totalCounts.leadsThisPeriod
    )} facilities were created in this period.`
  );

  report.sectionTitle("Status breakdown");
  breakdownTable(
    report,
    "Status",
    input.report.statusBreakdown.map((row) => ({
      name: row.status,
      count: row.count,
    }))
  );

  if (input.report.avgTimeByStatus.length) {
    report.sectionTitle("Time in status");
    report.table(
      [
        { header: "Status", width: 300 },
        { header: "Records", width: 108, align: "right" },
        { header: "Avg days", width: 108, align: "right" },
      ],
      input.report.avgTimeByStatus.map((row) => [
        row.status,
        num(row.count),
        row.averageDays,
      ])
    );
  }

  if (input.report.scorecard.length) {
    report.sectionTitle("Referral source scorecard");
    report.table(
      [
        { header: "Source", width: 246 },
        { header: "Tier", width: 90 },
        { header: "Referrals", width: 90, align: "right" },
        { header: "Per week", width: 90, align: "right" },
      ],
      input.report.scorecard.map((row) => [
        row.sourceName,
        row.tier,
        num(row.referralCount),
        row.referralsPerWeek.toFixed(1),
      ])
    );
  }

  const breakdowns: [string, string, { name: string; count: number }[]][] = [
    ["Referral sources", "Source", named(input.report.sources)],
    ["Facilities", "Facility", named(input.report.facilities)],
    ["Counties", "County", named(input.report.counties)],
    ["Payers", "Payer", named(input.report.payers)],
    ["Admission types", "Type", named(input.report.admissionTypes)],
    ["Clinicians", "Clinician", named(input.report.clinicians)],
  ];

  for (const [title, label, rows] of breakdowns) {
    if (!rows.length) continue;
    report.sectionTitle(title);
    breakdownTable(report, label, rows);
  }

  if (input.report.outreach.length) {
    report.sectionTitle("Outreach");
    report.table(
      [
        { header: "Facility", width: 408 },
        { header: "Recent referrals", width: 108, align: "right" },
      ],
      input.report.outreach
        .slice(0, 25)
        .map((row) => [row.facility ?? "Not set", num(row.recent_referrals)])
    );
  }

  if (denials.totalDenials) {
    report.sectionTitle("Denials");
    report.statBand([
      { label: "Total denials", value: num(denials.totalDenials) },
      {
        label: "Of referrals",
        value: rate(denials.totalDenials, totalCounts.totalReferrals),
      },
    ]);
    breakdownTable(
      report,
      "Reason",
      denials.reasons.map((row) => ({ name: row.reason, count: row.count }))
    );
  }

  const monthly: [string, { month: string; total: number }[]][] = [
    ["Discharges by month", input.report.discharge],
    ["Denials by month", denials.monthlyTrend],
    ["Admissions by month", conversion.monthlyAdmitted ?? []],
  ];

  for (const [title, rows] of monthly) {
    if (!rows.length) continue;
    report.sectionTitle(title);
    report.table(
      [
        { header: "Month", width: 408 },
        { header: "Total", width: 108, align: "right" },
      ],
      rows.map((row) => [row.month, num(row.total)])
    );
  }

  return await report.finish();
};
