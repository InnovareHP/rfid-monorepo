import { BoardFieldType } from "@prisma/client";
import {
  resolveDefaultCharts,
  type SeedContext,
  type SeedField,
} from "./default-analytics";

const field = (
  id: string,
  fieldName: string,
  fieldType: BoardFieldType
): SeedField => ({ id, fieldName, fieldType });

const REFERRAL_FIELDS = [
  field("f-status", "Status", BoardFieldType.STATUS),
  field("f-payor", "Payor", BoardFieldType.DROPDOWN),
  field("f-admission", "Admission Type", BoardFieldType.DROPDOWN),
  field("f-county", "County", BoardFieldType.DROPDOWN),
  field("f-reason", "Reason", BoardFieldType.TEXT),
];

const LEAD_FIELDS = [field("l-county", "County", BoardFieldType.DROPDOWN)];

const context = (
  fields: SeedField[],
  statusOptions: string[] = ["Pending", "Admitted", "Rejected"],
  relatedFields: SeedField[] = LEAD_FIELDS
): SeedContext => ({
  fields,
  optionNames: new Map([
    ["f-status", new Set(statusOptions.map((option) => option.toLowerCase()))],
  ]),
  relatedFields: new Map([["LEAD", relatedFields]]),
});

const byName = (moduleKey: string, ctx: SeedContext) =>
  resolveDefaultCharts(moduleKey, ctx).map((chart) => chart.name);

describe("resolveDefaultCharts", () => {
  it("covers every legacy referral metric the engine can express", () => {
    // Names and order mirror the legacy Referral Intelligence Dashboard, so the
    // seeded page reads as the same report.
    expect(byName("REFERRAL", context(REFERRAL_FIELDS))).toEqual([
      "Total Referrals",
      "Converted",
      "Avg. Time by Status",
      "Payer Source Mix",
      "Conversion-to-Admission Rate",
      "Status Breakdown",
      "Monthly Referral Trend",
      "Monthly Denial Trend",
      "Top 10 Counties Generating Referrals",
      "Top 5 Denial Reasons",
      "Top 10 Referring Facilities",
      "Admission Type",
      "Emerging Sources",
      "Referral Density by County",
      "Average Days to a Status Change",
    ]);
  });

  it("builds the conversion rate as a percentage of admitted referrals", () => {
    const conversion = resolveDefaultCharts(
      "REFERRAL",
      context(REFERRAL_FIELDS)
    ).find((chart) => chart.name === "Conversion-to-Admission Rate");

    expect(conversion).toMatchObject({
      chartType: "KPI",
      metricAggregation: "PERCENT",
      numeratorFilter: {
        match: "AND",
        conditions: [
          { fieldId: "f-status", operator: "eq", value: "Admitted" },
        ],
      },
    });
  });

  it("builds the duration charts off the status field", () => {
    const charts = resolveDefaultCharts("REFERRAL", context(REFERRAL_FIELDS));

    expect(
      charts.find((chart) => chart.name === "Avg. Time by Status")
    ).toMatchObject({
      chartType: "BAR",
      metricSource: "DAYS_TO_CHANGE",
      durationFieldId: "f-status",
      metricAggregation: "AVG",
    });
    expect(
      charts.find((chart) => chart.name === "Average Days to a Status Change")
    ).toMatchObject({ chartType: "LINE", dateBucket: "MONTH" });
  });

  it("walks the referral link for source charts", () => {
    const charts = resolveDefaultCharts("REFERRAL", context(REFERRAL_FIELDS));

    expect(
      charts.find((chart) => chart.name === "Top 10 Referring Facilities")
    ).toMatchObject({
      dimensionType: "RELATED_RECORD",
      relationType: "REFERRAL_LINK",
      relatedFieldId: null,
      groupLimit: 10,
    });
    expect(
      charts.find(
        (chart) => chart.name === "Top 10 Counties Generating Referrals"
      )
    ).toMatchObject({ relatedFieldId: "l-county" });
    expect(
      charts.find((chart) => chart.name === "Emerging Sources")
    ).toMatchObject({ maxGroupSize: 4 });
  });

  it("keeps only the denial statuses the organization actually defines", () => {
    const denials = resolveDefaultCharts(
      "REFERRAL",
      context(REFERRAL_FIELDS, ["Pending", "Admitted", "Rejected"])
    ).find((chart) => chart.name === "Top 5 Denial Reasons");

    expect(denials?.filter.conditions).toEqual([
      { fieldId: "f-status", operator: "in", value: "Rejected" },
    ]);
  });

  it("drops a value-dependent chart when the organization renamed its statuses", () => {
    const names = byName(
      "REFERRAL",
      context(REFERRAL_FIELDS, ["New", "Won", "Lost"])
    );

    expect(names).not.toContain("Conversion-to-Admission Rate");
    expect(names).not.toContain("Top 5 Denial Reasons");
    expect(names).toContain("Status Breakdown");
  });

  it("drops a relation chart when the far module lacks the field", () => {
    const names = byName("REFERRAL", context(REFERRAL_FIELDS, undefined, []));

    expect(names).not.toContain("Top 10 Counties Generating Referrals");
    expect(names).toContain("Top 10 Referring Facilities");
  });

  it("skips a breakdown whose field the org renamed or deleted", () => {
    const names = byName(
      "REFERRAL",
      context([field("f-status", "Status", BoardFieldType.STATUS)])
    );

    expect(names).not.toContain("Payer Source Mix");
    expect(names).not.toContain("Top 5 Denial Reasons");
    expect(names).toContain("Status Breakdown");
  });

  it("buckets the time series by month and leaves the KPI dimensionless", () => {
    const charts = resolveDefaultCharts("LEAD", context(LEAD_FIELDS));

    expect(charts.find((chart) => chart.chartType === "KPI")).toMatchObject({
      name: "Total Facilities",
      dimensionFieldId: null,
      dateBucket: null,
    });
    expect(charts.find((chart) => chart.chartType === "LINE")).toMatchObject({
      dateBucket: "MONTH",
    });
  });

  it("groups a custom module by its status field", () => {
    const charts = resolveDefaultCharts(
      "INSPECTION",
      context([
        field("f-note", "Note", BoardFieldType.TEXT),
        field("f-stage", "Stage", BoardFieldType.STATUS),
        field("f-kind", "Kind", BoardFieldType.DROPDOWN),
      ])
    );

    expect(charts[2]).toMatchObject({
      name: "By stage",
      chartType: "PIE",
      dimensionFieldId: "f-stage",
    });
  });

  it("falls back to a dropdown when a custom module has no status", () => {
    const charts = resolveDefaultCharts(
      "INSPECTION",
      context([field("f-kind", "Kind", BoardFieldType.DROPDOWN)])
    );

    expect(charts[2]?.dimensionFieldId).toBe("f-kind");
  });

  it("seeds only count and trend when nothing is groupable", () => {
    const charts = resolveDefaultCharts(
      "INSPECTION",
      context([field("f-note", "Note", BoardFieldType.TEXT)])
    );

    expect(charts).toHaveLength(2);
  });
});
