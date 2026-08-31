import {
  BoardFieldType,
  CustomAnalyticAggregation,
  CustomAnalyticChartType,
  CustomAnalyticDateBucket,
  CustomAnalyticDimensionType,
  CustomAnalyticMarketingGroupBy,
  CustomAnalyticMarketingMeasure,
  CustomAnalyticMetricSource,
  CustomAnalyticTileSpan,
  RelationType,
} from "@prisma/client";
import type { FilterOperator } from "./analytic-filter";
import { prisma } from "../prisma/prisma";

// A default chart is described by field name, not field id: the ids differ per
// organization, so they are resolved against that org's own fields at seed
// time. A chart whose field or option values are missing is skipped rather
// than seeded to render nothing.
type DefaultCondition = {
  fieldName: string;
  operator: FilterOperator;
  value: string;
  // The value is a candidate list; only the entries that exist as options on
  // the field survive, and the chart is dropped when none do.
  fromOptions?: boolean;
};

type DefaultChart = {
  name: string;
  chartType: CustomAnalyticChartType;
  // Tile width on the dashboard grid; half when a chart does not say.
  span?: CustomAnalyticTileSpan;
  // Dimension field for BAR and PIE.
  fieldName?: string;
  // Grouping that needs no field, such as the record's assigned liaison.
  dimensionType?: CustomAnalyticDimensionType;
  dateBucket?: CustomAnalyticDateBucket;
  aggregation?: CustomAnalyticAggregation;
  conditions?: DefaultCondition[];
  // Numerator for a PERCENT chart.
  percentOf?: DefaultCondition;
  // Measures days from record creation to each change of this field.
  durationFieldName?: string;
  // Reads Marketing instead of the board; needs no field, so it is never
  // dropped for a missing one.
  marketing?: {
    measure: CustomAnalyticMarketingMeasure;
    groupBy?: CustomAnalyticMarketingGroupBy;
  };
  relation?: {
    relationType: RelationType;
    relatedModuleKey?: string;
    relatedFieldName?: string;
  };
  groupLimit?: number;
  maxGroupSize?: number;
};

export type SeedField = {
  id: string;
  fieldName: string;
  fieldType: BoardFieldType;
};

export type SeedContext = {
  fields: SeedField[];
  // fieldId -> the option names defined on it, lowercased for comparison.
  optionNames: Map<string, Set<string>>;
  // moduleKey -> that module's fields, for a relation's far side.
  relatedFields: Map<string, SeedField[]>;
};

export type ResolvedChart = {
  name: string;
  chartType: CustomAnalyticChartType;
  metricAggregation: CustomAnalyticAggregation;
  dimensionType: CustomAnalyticDimensionType;
  dimensionFieldId: string | null;
  dateBucket: CustomAnalyticDateBucket | null;
  filter: { match: "AND"; conditions: ResolvedCondition[] };
  numeratorFilter: { match: "AND"; conditions: ResolvedCondition[] };
  metricSource: CustomAnalyticMetricSource;
  durationFieldId: string | null;
  relationType: RelationType | null;
  relatedFieldId: string | null;
  groupLimit: number | null;
  maxGroupSize: number | null;
  tileSpan: CustomAnalyticTileSpan;
  marketingMeasure: CustomAnalyticMarketingMeasure;
  marketingGroupBy: CustomAnalyticMarketingGroupBy | null;
};

type ResolvedCondition = {
  fieldId: string;
  operator: FilterOperator;
  value: string;
};

const TOTAL_RECORDS: DefaultChart = {
  name: "Total records",
  chartType: "KPI",
};

const CREATED_PER_MONTH: DefaultChart = {
  name: "Created per month",
  chartType: "LINE",
  dateBucket: "MONTH",
};

// Mirrors the breakdowns the hardcoded analytics page renders, expressed as
// data. Each entry names the legacy metric it replaces.
const DEFAULT_CHARTS: Record<string, DefaultChart[]> = {
  // The master marketing list's page is a liaison performance overview, so the
  // module's own dashboard is the same report. Its headline numbers come from
  // Marketing outreach logs, not from the facility board.
  LEAD: [
    {
      name: "Total Facilities",
      chartType: "KPI",
      span: "THIRD",
      marketing: { measure: "FACILITIES" },
    },
    {
      name: "Active Partners",
      chartType: "KPI",
      span: "THIRD",
      marketing: { measure: "PEOPLE" },
    },
    {
      name: "Total Interactions",
      chartType: "KPI",
      span: "THIRD",
      marketing: { measure: "INTERACTIONS" },
    },
    {
      name: "Interactions per Liaison",
      chartType: "BAR",
      span: "HALF",
      marketing: { measure: "INTERACTIONS", groupBy: "LIAISON" },
    },
    {
      name: "Facilities Covered per Liaison",
      chartType: "BAR",
      span: "HALF",
      marketing: { measure: "FACILITIES", groupBy: "LIAISON" },
    },
    {
      name: "People Contacted per Liaison",
      chartType: "BAR",
      span: "HALF",
      marketing: { measure: "PEOPLE", groupBy: "LIAISON" },
    },
    {
      name: "Touchpoint Mix",
      chartType: "PIE",
      span: "HALF",
      marketing: { measure: "INTERACTIONS", groupBy: "TOUCHPOINT" },
    },
    {
      name: "Monthly Outreach Trend",
      chartType: "LINE",
      span: "HALF",
      dateBucket: "MONTH",
      marketing: { measure: "INTERACTIONS" },
    },
    {
      name: "Most Visited Facilities",
      chartType: "BAR",
      span: "HALF",
      groupLimit: 10,
      marketing: { measure: "INTERACTIONS", groupBy: "FACILITY" },
    },
    // The board half: facilities are assigned to a liaison on the record.
    {
      name: "Facilities Assigned per Liaison",
      chartType: "BAR",
      span: "HALF",
      dimensionType: "OWNER",
    },
    {
      name: "Facilities Added per Month",
      chartType: "LINE",
      dateBucket: "MONTH",
      span: "HALF",
    },
    {
      name: "Facilities by County",
      chartType: "BAR",
      fieldName: "County",
      span: "HALF",
    },
  ],
  // Ordered and named to match the legacy Referral Intelligence Dashboard, so
  // the seeded page reads as the same report. A chart whose field the
  // organization does not have resolves to null and is dropped.
  REFERRAL: [
    { name: "Total Referrals", chartType: "KPI", span: "THIRD" },
    // getConversionRate's numerator, as a count of its own.
    {
      name: "Converted",
      chartType: "KPI",
      span: "THIRD",
      conditions: [
        {
          fieldName: "Status",
          operator: "eq",
          value: "Admitted",
          fromOptions: true,
        },
      ],
    },
    // getAverageTimeByStatus
    {
      name: "Avg. Time by Status",
      chartType: "BAR",
      span: "THIRD",
      aggregation: "AVG",
      durationFieldName: "Status",
    },
    // getPayerMix
    {
      name: "Payer Source Mix",
      chartType: "PIE",
      fieldName: "Payor",
      span: "THIRD",
    },
    // getConversionRate
    {
      name: "Conversion-to-Admission Rate",
      chartType: "KPI",
      span: "THIRD",
      aggregation: "PERCENT",
      percentOf: {
        fieldName: "Status",
        operator: "eq",
        value: "Admitted",
        fromOptions: true,
      },
    },
    // getStatusBreakdown
    {
      name: "Status Breakdown",
      chartType: "PIE",
      fieldName: "Status",
      span: "THIRD",
    },
    // getOutreachImpact
    {
      name: "Monthly Referral Trend",
      chartType: "LINE",
      dateBucket: "MONTH",
      span: "HALF",
    },
    // getDenialTracking's trend half
    {
      name: "Monthly Denial Trend",
      chartType: "LINE",
      dateBucket: "MONTH",
      span: "HALF",
      conditions: [
        {
          fieldName: "Status",
          operator: "in",
          value: "Rejected,Denied",
          fromOptions: true,
        },
      ],
    },
    // getTopCounties
    {
      name: "Top 10 Counties Generating Referrals",
      chartType: "BAR",
      span: "TWO_THIRDS",
      relation: {
        relationType: "REFERRAL_LINK",
        relatedModuleKey: "LEAD",
        relatedFieldName: "County",
      },
      groupLimit: 10,
    },
    // getDenialTracking's reason half
    {
      name: "Top 5 Denial Reasons",
      chartType: "BAR",
      span: "THIRD",
      fieldName: "Reason",
      groupLimit: 5,
      conditions: [
        {
          fieldName: "Status",
          operator: "in",
          value: "Rejected,Denied",
          fromOptions: true,
        },
      ],
    },
    // getTopFacilities
    {
      name: "Top 10 Referring Facilities",
      chartType: "BAR",
      span: "THIRD",
      relation: { relationType: "REFERRAL_LINK" },
      groupLimit: 10,
    },
    // getTopClinicians
    {
      name: "Top 10 Referring Clinicians",
      chartType: "BAR",
      span: "THIRD",
      fieldName: "Contact",
      groupLimit: 10,
    },
    // getReferralSourceBreakdown
    {
      name: "Referral Source Type Breakdown",
      chartType: "PIE",
      span: "THIRD",
      fieldName: "Referral Source Type",
    },
    // getAdmissionTypeBreakdown
    {
      name: "Admission Type",
      chartType: "PIE",
      fieldName: "Admission Type",
      span: "THIRD",
    },
    // getEmergingSources
    {
      name: "Emerging Sources",
      chartType: "BAR",
      span: "THIRD",
      relation: { relationType: "REFERRAL_LINK" },
      maxGroupSize: 4,
    },
    // The legacy page's county density map, same grouping as the county bar.
    {
      name: "Referral Density by County",
      chartType: "MAP",
      span: "FULL",
      relation: {
        relationType: "REFERRAL_LINK",
        relatedModuleKey: "LEAD",
        relatedFieldName: "County",
      },
      groupLimit: 50,
    },
    // getAvgTimeTrend
    {
      name: "Average Days to a Status Change",
      chartType: "LINE",
      span: "THIRD",
      dateBucket: "MONTH",
      aggregation: "AVG",
      durationFieldName: "Status",
    },
  ],
};

// Contacts and companies get no seeded page: their breakdowns carried no
// signal worth a nav row of their own.
const NO_DEFAULT_MODULES = new Set(["CONTACT", "COMPANY"]);

// A custom module has no known field names, so its breakdown is whichever
// field can actually be grouped - a status first, then any dropdown.
const customModuleCharts = (fields: SeedField[]): DefaultChart[] => {
  const groupable =
    fields.find((field) => field.fieldType === BoardFieldType.STATUS) ??
    fields.find((field) => field.fieldType === BoardFieldType.DROPDOWN);

  return [
    TOTAL_RECORDS,
    CREATED_PER_MONTH,
    ...(groupable
      ? [
          {
            name: `By ${groupable.fieldName.toLowerCase()}`,
            chartType: "PIE" as CustomAnalyticChartType,
            fieldName: groupable.fieldName,
          },
        ]
      : []),
  ];
};

const EMPTY_FILTER = { match: "AND" as const, conditions: [] };

// Returns null when the condition cannot be expressed for this organization,
// which drops the chart that carries it.
const resolveCondition = (
  condition: DefaultCondition,
  context: SeedContext
): ResolvedCondition | null => {
  const field = context.fields.find(
    (candidate) => candidate.fieldName === condition.fieldName
  );
  if (!field) return null;

  if (!condition.fromOptions) {
    return {
      fieldId: field.id,
      operator: condition.operator,
      value: condition.value,
    };
  }

  const options = context.optionNames.get(field.id) ?? new Set<string>();
  const present = condition.value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => options.has(entry.toLowerCase()));

  if (present.length === 0) return null;

  return {
    fieldId: field.id,
    operator: condition.operator,
    value: present.join(","),
  };
};

const resolveChart = (
  chart: DefaultChart,
  context: SeedContext
): ResolvedChart | null => {
  const fieldByName = (fieldName: string) =>
    context.fields.find((field) => field.fieldName === fieldName) ?? null;

  const dimensionField = chart.fieldName ? fieldByName(chart.fieldName) : null;
  if (chart.fieldName && !dimensionField) return null;

  const durationField = chart.durationFieldName
    ? fieldByName(chart.durationFieldName)
    : null;
  if (chart.durationFieldName && !durationField) return null;

  let relatedFieldId: string | null = null;
  if (chart.relation?.relatedFieldName) {
    const relatedModule = context.relatedFields.get(
      chart.relation.relatedModuleKey ?? ""
    );
    const relatedField = relatedModule?.find(
      (field) => field.fieldName === chart.relation?.relatedFieldName
    );
    if (!relatedField) return null;
    relatedFieldId = relatedField.id;
  }

  const conditions: ResolvedCondition[] = [];
  for (const condition of chart.conditions ?? []) {
    const resolved = resolveCondition(condition, context);
    if (!resolved) return null;
    conditions.push(resolved);
  }

  const numerator = chart.percentOf
    ? resolveCondition(chart.percentOf, context)
    : null;
  if (chart.percentOf && !numerator) return null;

  const dimensionType: CustomAnalyticDimensionType = chart.relation
    ? "RELATED_RECORD"
    : (chart.dimensionType ?? "FIELD");

  return {
    name: chart.name,
    chartType: chart.chartType,
    metricAggregation: chart.aggregation ?? "COUNT",
    dimensionType,
    dimensionFieldId: dimensionField?.id ?? null,
    dateBucket: chart.dateBucket ?? null,
    filter: { match: "AND", conditions },
    numeratorFilter: numerator
      ? { match: "AND", conditions: [numerator] }
      : EMPTY_FILTER,
    metricSource: chart.marketing
      ? "MARKETING_ACTIVITY"
      : durationField
        ? "DAYS_TO_CHANGE"
        : "FIELD_VALUE",
    durationFieldId: durationField?.id ?? null,
    relationType: chart.relation?.relationType ?? null,
    relatedFieldId,
    groupLimit: chart.groupLimit ?? null,
    maxGroupSize: chart.maxGroupSize ?? null,
    tileSpan: chart.span ?? "HALF",
    marketingMeasure: chart.marketing?.measure ?? "INTERACTIONS",
    marketingGroupBy: chart.marketing?.groupBy ?? null,
  };
};

export const resolveDefaultCharts = (
  moduleKey: string,
  context: SeedContext
): ResolvedChart[] => {
  if (NO_DEFAULT_MODULES.has(moduleKey)) return [];

  const charts =
    DEFAULT_CHARTS[moduleKey] ?? customModuleCharts(context.fields);

  return charts.flatMap((chart) => {
    const resolved = resolveChart(chart, context);
    return resolved ? [resolved] : [];
  });
};

const buildContext = async (
  moduleId: string,
  organizationId: string
): Promise<SeedContext> => {
  const fields = await prisma.field.findMany({
    where: { organizationId, moduleId, isDeleted: false },
    orderBy: { fieldOrder: "asc" },
    select: { id: true, fieldName: true, fieldType: true },
  });

  // FieldOption.optionName is not encrypted, so a default that depends on a
  // value existing can be checked rather than guessed.
  const options = await prisma.fieldOption.findMany({
    where: {
      organizationId,
      isDeleted: false,
      fieldId: { in: fields.map((field) => field.id) },
    },
    select: { fieldId: true, optionName: true },
  });

  const optionNames = new Map<string, Set<string>>();
  for (const option of options) {
    const names = optionNames.get(option.fieldId) ?? new Set<string>();
    names.add(option.optionName.toLowerCase());
    optionNames.set(option.fieldId, names);
  }

  // Only the modules a default relation actually reaches across.
  const relatedModules = await prisma.module.findMany({
    where: { organizationId, key: { in: ["LEAD", "REFERRAL"] } },
    select: {
      key: true,
      fields: { select: { id: true, fieldName: true, fieldType: true } },
    },
  });

  return {
    fields,
    optionNames,
    relatedFields: new Map(
      relatedModules.map((module) => [module.key, module.fields])
    ),
  };
};

// Idempotent: an organization that already has a default page for this module
// keeps it, so re-running onboarding never duplicates charts.
export const seedDefaultAnalytics = async (
  moduleId: string,
  organizationId: string
) => {
  const [module, existing] = await Promise.all([
    prisma.module.findFirst({
      where: { id: moduleId, organizationId },
      select: { key: true, label: true },
    }),
    prisma.customAnalyticDashboard.findFirst({
      where: { organizationId, moduleId, isDefault: true },
      select: { id: true },
    }),
  ]);

  if (!module || existing) return existing ?? null;

  const context = await buildContext(moduleId, organizationId);
  const charts = resolveDefaultCharts(module.key, context);
  if (charts.length === 0) return null;

  return prisma.customAnalyticDashboard.create({
    data: {
      name: `${module.label} Analytics`,
      organizationId,
      moduleId,
      isDefault: true,
      analytics: {
        create: charts.map((chart, index) => ({
          name: chart.name,
          chartType: chart.chartType,
          metricAggregation: chart.metricAggregation,
          dimensionType: chart.dimensionType,
          dimensionFieldId: chart.dimensionFieldId,
          dateBucket: chart.dateBucket,
          columnIds: [],
          filter: chart.filter,
          numeratorFilter: chart.numeratorFilter,
          metricSource: chart.metricSource,
          durationFieldId: chart.durationFieldId,
          relationType: chart.relationType,
          relatedFieldId: chart.relatedFieldId,
          groupLimit: chart.groupLimit,
          maxGroupSize: chart.maxGroupSize,
          tileSpan: chart.tileSpan,
          marketingMeasure: chart.marketingMeasure,
          marketingGroupBy: chart.marketingGroupBy,
          rangeDays: null,
          dashboardOrder: index,
          moduleId,
          organizationId,
        })),
      },
    },
    select: { id: true },
  });
};
