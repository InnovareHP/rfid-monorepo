import type { MasterListAnalyticsResponse } from "@dashboard/shared";
import {
  breakdownTable,
  createReport,
  longDate,
  num,
  percent,
  periodLabel,
} from "../../lib/documents/report-pdf";

const named = (rows: { value: string | null; _count: { value: number } }[]) =>
  rows.map((row) => ({
    name: row.value ?? "Not set",
    count: row._count.value,
  }));

export const renderMasterListAnalyticsPdf = async (input: {
  organizationName: string;
  report: MasterListAnalyticsResponse;
  startDate?: Date;
  endDate?: Date;
  scope: string;
}): Promise<Buffer> => {
  const report = createReport({
    title: "Master List Analytics Report",
    organizationName: input.organizationName,
    meta: [
      { label: "Period", value: periodLabel(input.startDate, input.endDate) },
      { label: "Scope", value: input.scope },
      { label: "Generated", value: longDate(new Date()) },
    ],
  });

  const { totals } = input.report;

  report.sectionTitle("Summary");
  report.statBand([
    { label: "Facilities", value: num(totals.totalFacilities) },
    { label: "Referring", value: num(totals.referringFacilities) },
    { label: "Dormant", value: num(totals.dormantFacilities) },
    { label: "Coverage", value: percent(totals.coverageRate) },
  ]);
  report.note(
    `${num(totals.facilitiesThisPeriod)} facilities were added in this period.`
  );

  const breakdowns: [string, string, { name: string; count: number }[]][] = [
    [
      "Status breakdown",
      "Status",
      input.report.statusBreakdown.map((row) => ({
        name: row.status,
        count: row.count,
      })),
    ],
    ["Facility types", "Type", named(input.report.facilityTypes)],
    ["Counties", "County", named(input.report.counties)],
    ["Facilities by liaison", "Liaison", named(input.report.byLiaison)],
    [
      "Top referring facilities",
      "Facility",
      named(input.report.topReferringFacilities),
    ],
  ];

  for (const [title, label, rows] of breakdowns) {
    if (!rows.length) continue;
    report.sectionTitle(title);
    breakdownTable(report, label, rows);
  }

  if (input.report.growthTrend.length) {
    report.sectionTitle("Growth by month");
    report.table(
      [
        { header: "Month", width: 408 },
        { header: "Facilities added", width: 108, align: "right" },
      ],
      input.report.growthTrend.map((row) => [row.month, num(row.total)])
    );
  }

  // Named rather than counted: this is the follow-up list someone acts on.
  if (input.report.dormant.length) {
    report.sectionTitle("Dormant facilities");
    report.table(
      [
        { header: "Facility", width: 366 },
        { header: "County", width: 150 },
      ],
      input.report.dormant.map((row) => [row.name, row.county ?? "Not set"])
    );
  }

  return await report.finish();
};
