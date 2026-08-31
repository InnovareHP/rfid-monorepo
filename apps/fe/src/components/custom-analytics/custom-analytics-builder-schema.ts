import { z } from "zod";

const conditionSchema = z.object({
  fieldId: z.string().min(1, "Pick a field"),
  operator: z.enum([
    "eq",
    "neq",
    "contains",
    "in",
    "gt",
    "lt",
    "isEmpty",
    "isNotEmpty",
  ]),
  value: z.string(),
});

export const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    moduleId: z.string().min(1, "Pick a module"),
    chartType: z.enum(["BAR", "LINE", "PIE", "KPI", "TABLE", "MAP"]),
    // Tile width once the chart sits on a dashboard.
    tileSpan: z.enum(["THIRD", "HALF", "TWO_THIRDS", "FULL"]),
    metricFieldId: z.string(),
    metricSource: z.enum([
      "FIELD_VALUE",
      "DAYS_TO_CHANGE",
      "MARKETING_ACTIVITY",
    ]),
    durationFieldId: z.string(),
    marketingMeasure: z.enum(["INTERACTIONS", "FACILITIES", "PEOPLE"]),
    // "" is the ungrouped state a KPI or a trend uses.
    marketingGroupBy: z.union([
      z.literal(""),
      z.enum(["LIAISON", "FACILITY", "TOUCHPOINT"]),
    ]),
    metricAggregation: z.enum([
      "SUM",
      "AVG",
      "COUNT",
      "MIN",
      "MAX",
      "PERCENT",
    ]),
    dimensionType: z.enum(["FIELD", "OWNER", "DATE", "RELATED_RECORD"]),
    // "" is the unpicked state; the dialog drops it rather than sending it.
    relationType: z.union([
      z.literal(""),
      z.enum([
        "REFERRAL_LINK",
        "FACILITY_LINK",
        "CONTACT_LINK",
        "COMPANY_LINK",
      ]),
    ]),
    relationDirection: z.enum(["OUTGOING", "INCOMING"]),
    // Only used to populate the related field list; the API stores the field.
    relatedModuleId: z.string(),
    relatedFieldId: z.string(),
    dimensionFieldId: z.string(),
    dateBucket: z.enum(["DAY", "WEEK", "MONTH"]),
    columnIds: z.array(z.string()),
    range: z.string(),
    groupLimit: z.string(),
    filterMatch: z.enum(["AND", "OR"]),
    numeratorMatch: z.enum(["AND", "OR"]),
    minGroupSize: z.string(),
    maxGroupSize: z.string(),
    numeratorConditions: z.array(conditionSchema),
    conditions: z.array(conditionSchema),
  })
  .superRefine((values, ctx) => {
    if (values.chartType === "TABLE" && values.columnIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Pick at least one column",
        path: ["columnIds"],
      });
    }
    if (
      ["BAR", "PIE", "MAP"].includes(values.chartType) &&
      values.dimensionType === "RELATED_RECORD" &&
      !values.relationType
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a relation",
        path: ["relationType"],
      });
    }
    if (
      ["BAR", "PIE", "MAP"].includes(values.chartType) &&
      values.dimensionType === "FIELD" &&
      !values.dimensionFieldId
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a grouping field",
        path: ["dimensionFieldId"],
      });
    }
    if (values.metricSource === "MARKETING_ACTIVITY") {
      if (values.chartType === "TABLE") {
        ctx.addIssue({
          code: "custom",
          message: "An outreach metric cannot be rendered as a table",
          path: ["chartType"],
        });
      }
      if (
        ["BAR", "PIE"].includes(values.chartType) &&
        !values.marketingGroupBy
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Pick what to group the outreach by",
          path: ["marketingGroupBy"],
        });
      }
    }
    if (values.metricSource === "DAYS_TO_CHANGE") {
      if (!values.durationFieldId) {
        ctx.addIssue({
          code: "custom",
          message: "Pick the field whose changes are measured",
          path: ["durationFieldId"],
        });
      }
      if (values.chartType === "TABLE") {
        ctx.addIssue({
          code: "custom",
          message: "A time-to-change metric cannot be rendered as a table",
          path: ["chartType"],
        });
      }
      if (values.metricAggregation === "PERCENT") {
        ctx.addIssue({
          code: "custom",
          message: "A time-to-change metric has no percentage to compute",
          path: ["metricAggregation"],
        });
      }
    }
    if (
      values.metricAggregation === "PERCENT" &&
      values.numeratorConditions.filter((condition) => condition.fieldId)
        .length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "A percentage needs at least one numerator condition",
        path: ["numeratorConditions"],
      });
    }
    if (
      values.metricAggregation !== "COUNT" &&
      values.metricAggregation !== "PERCENT" &&
      !values.metricFieldId &&
      values.chartType !== "TABLE"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a metric field",
        path: ["metricFieldId"],
      });
    }
  });

export type BuilderValues = z.infer<typeof schema>;
export type BuilderCondition = BuilderValues["conditions"][number];

// isEmpty and isNotEmpty read the cell alone, so they hide the value input.
export const VALUELESS_OPERATORS: BuilderCondition["operator"][] = [
  "isEmpty",
  "isNotEmpty",
];
