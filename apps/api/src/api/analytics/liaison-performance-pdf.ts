import type {
  LiaisonAnalyticsCardData,
  MarketingAnalyticsResponse,
} from "@dashboard/shared";
import {
  createReport,
  longDate,
  num,
  periodLabel,
  rate,
  titleCase,
} from "../../lib/documents/report-pdf";

type Report = MarketingAnalyticsResponse;

export const renderLiaisonPerformancePdf = async (input: {
  organizationName: string;
  report: Report;
  startDate?: Date;
  endDate?: Date;
  liaisonName: string | null;
}): Promise<Buffer> => {
  const report = createReport({
    title: "Liaison Performance Report",
    organizationName: input.organizationName,
    meta: [
      { label: "Period", value: periodLabel(input.startDate, input.endDate) },
      { label: "Scope", value: input.liaisonName ?? "All liaisons" },
      { label: "Generated", value: longDate(new Date()) },
    ],
  });

  const { referrals, admissions } = input.report.totals;
  const liaisons = [...input.report.analytics].sort(
    (a, b) => b.totalReferrals - a.totalReferrals
  );

  report.sectionTitle("Summary");
  report.statBand([
    { label: "Referrals", value: num(referrals) },
    { label: "Admissions", value: num(admissions) },
    { label: "Conversion", value: rate(admissions, referrals) },
    { label: "Liaisons", value: num(liaisons.length) },
  ]);

  report.sectionTitle("Liaison summary");
  if (!liaisons.length) {
    report.note("No liaison activity in this period.");
  } else {
    // Ordered by referrals so the table opens with the biggest contributor.
    report.table(
      [
        { header: "Liaison", width: 132 },
        { header: "Level", width: 58 },
        { header: "Facilities", width: 66, align: "right" },
        { header: "New", width: 38, align: "right" },
        { header: "Referrals", width: 64, align: "right" },
        { header: "Admits", width: 52, align: "right" },
        { header: "Conv", width: 44, align: "right" },
        { header: "Touches", width: 62, align: "right" },
      ],
      liaisons.map((liaison) => [
        liaison.memberName,
        liaison.engagementLevel,
        num(liaison.totalLeads),
        num(liaison.newLeads),
        num(liaison.totalReferrals),
        num(liaison.admissions),
        rate(liaison.admissions, liaison.totalReferrals),
        num(liaison.totalInteractions),
      ])
    );
  }

  const detail = (liaison: LiaisonAnalyticsCardData) => {
    report.subTitle(
      liaison.memberName,
      `${liaison.engagementLevel} engagement · ${num(
        liaison.totalInteractions
      )} interactions · ${rate(
        liaison.admissions,
        liaison.totalReferrals
      )} conversion`
    );

    if (liaison.touchpointsUsed.length) {
      report.table(
        [
          { header: "Touchpoint", width: 260 },
          { header: "Count", width: 70, align: "right" },
        ],
        [...liaison.touchpointsUsed]
          .sort((a, b) => b.count - a.count)
          .map((touchpoint) => [
            titleCase(touchpoint.type),
            num(touchpoint.count),
          ])
      );
    }

    report.columnList("Facilities covered", liaison.facilitiesCovered);
    report.columnList("Stakeholders", liaison.peopleContacted);
  };

  if (liaisons.length) {
    report.sectionTitle("Liaison detail");
    liaisons.forEach(detail);
  }

  const analysis = input.report.analysis;
  if (analysis) {
    const sections: [string, string[]][] = [
      ["Key insights", analysis.keyInsights],
      ["Strengths", analysis.strengths],
      ["Areas to improve", analysis.weaknesses],
      ["Recommendations", analysis.actionableRecommendations],
      ["Engagement optimizations", analysis.engagementOptimizations],
    ];

    for (const [title, items] of sections) {
      if (!items?.length) continue;
      report.sectionTitle(title);
      report.bullets(items);
    }
  }

  return await report.finish();
};
