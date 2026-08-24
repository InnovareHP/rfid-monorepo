import { z } from "zod";

export const ChartTypeSchema = z.enum(["BAR", "LINE", "PIE", "KPI", "TABLE"]);
export const AggregationSchema = z.enum(["SUM", "AVG", "COUNT", "MIN", "MAX"]);
// Explicit grouping mode and date bucket size, since "group by owner" is a
// scalar column lookup and "group by date" needs a bucket, not a field id.
export const DimensionTypeSchema = z.enum(["FIELD", "OWNER", "DATE"]);
export const DateBucketSchema = z.enum(["DAY", "WEEK", "MONTH"]);

// Raw field schemas with no .default(), shared by the full (create/preview)
// object and the update object. A field with .default() still resolves to
// that default when the key is omitted, even under .partial() — it never
// reads back as undefined — so an update schema built from these would not
// be able to tell "not sent" from "sent as its default value". The update
// schema below composes these raw pieces directly instead, so an omitted key
// stays genuinely undefined for the cross-field rules to check against.
const moduleIdField = z.string().uuid();
const chartTypeField = ChartTypeSchema;
const metricFieldIdField = z.string().uuid().nullable();
const metricAggregationField = AggregationSchema;
const dimensionTypeField = DimensionTypeSchema;
const dimensionFieldIdField = z.string().uuid().nullable();
const dateBucketField = DateBucketSchema;
const columnIdsField = z.array(z.string().uuid());
const filterField = z.record(z.string(), z.string());
const rangeDaysField = z.number().int().positive().max(3650).nullable();
const nameField = z.string().trim().min(1).max(80);

const base = z.object({
  moduleId: moduleIdField,
  chartType: chartTypeField,
  metricFieldId: metricFieldIdField.default(null),
  metricAggregation: metricAggregationField.default("COUNT"),
  dimensionType: dimensionTypeField.default("FIELD"),
  dimensionFieldId: dimensionFieldIdField.default(null),
  dateBucket: dateBucketField.default("DAY"),
  columnIds: columnIdsField.default([]),
  filter: filterField.default({}),
  rangeDays: rangeDaysField.default(null),
});

// Cross-field rules for a full payload (preview and create always send every
// field, since defaults fill in the rest).
const withChartRules = <T extends typeof base>(schema: T) =>
  schema.superRefine((value, ctx) => {
    if (value.chartType === "TABLE" && value.columnIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Pick at least one column",
        path: ["columnIds"],
      });
    }
    if (["BAR", "PIE"].includes(value.chartType)) {
      if (value.dimensionType === "FIELD" && !value.dimensionFieldId) {
        ctx.addIssue({
          code: "custom",
          message: "Pick a grouping field",
          path: ["dimensionFieldId"],
        });
      }
      if (value.dimensionType === "DATE" && !value.dateBucket) {
        ctx.addIssue({
          code: "custom",
          message: "Pick a date bucket",
          path: ["dateBucket"],
        });
      }
    }
    if (
      value.metricAggregation !== "COUNT" &&
      !value.metricFieldId &&
      value.chartType !== "TABLE"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a metric field",
        path: ["metricFieldId"],
      });
    }
  });

export const PreviewCustomAnalyticSchema = withChartRules(base);
export const SaveCustomAnalyticSchema = withChartRules(
  base.extend({ name: nameField })
);

// zod@4.3.6 throws at runtime ("cannot be used on object schemas containing
// refinements") when .partial() is called on a schema carrying .superRefine(),
// so the update schema is a fresh object built from the raw, undefaulted field
// schemas above rather than SaveCustomAnalyticSchema.partial() or base.partial()
// — the latter would still apply base's .default() values to omitted keys,
// making every field look "present" and defeating the whole point of the
// permissive check below. An update only ever touches the fields it sends, so
// every cross-field rule only fires when every field it depends on is
// genuinely present (not merely defaulted) in this payload — the service
// layer's assertOwned module/field ownership checks are the real safety net
// here, not this DTO.
const updateBase = z.object({
  name: nameField.optional(),
  moduleId: moduleIdField.optional(),
  chartType: chartTypeField.optional(),
  metricFieldId: metricFieldIdField.optional(),
  metricAggregation: metricAggregationField.optional(),
  dimensionType: dimensionTypeField.optional(),
  dimensionFieldId: dimensionFieldIdField.optional(),
  dateBucket: dateBucketField.optional(),
  columnIds: columnIdsField.optional(),
  filter: filterField.optional(),
  rangeDays: rangeDaysField.optional(),
});

// Query params for the run endpoints (single analytic and dashboard). Both
// present or both absent; when present, start must not be after end.
// Kept as strings (not z.coerce.date()) because zod-to-json-schema cannot
// represent a Date output type and crashes Swagger doc generation at
// bootstrap - dates are parsed with `new Date()` after validation instead.
const runDateRangeShape = {
  startDate: z.string().optional(),
  endDate: z.string().optional(),
};

const withDateRangeRules = <T extends { startDate?: string; endDate?: string }>(
  schema: z.ZodType<T>
) =>
  schema
    .refine((v) => (v.startDate == null) === (v.endDate == null), {
      message: "startDate and endDate must be provided together",
    })
    .refine(
      (v) => v.startDate == null || !Number.isNaN(Date.parse(v.startDate)),
      { message: "startDate must be a valid date", path: ["startDate"] }
    )
    .refine((v) => v.endDate == null || !Number.isNaN(Date.parse(v.endDate)), {
      message: "endDate must be a valid date",
      path: ["endDate"],
    })
    .refine(
      (v) =>
        v.startDate == null ||
        Date.parse(v.startDate) <= Date.parse(v.endDate!),
      { message: "startDate must not be after endDate", path: ["startDate"] }
    );

export const RunCustomAnalyticQuerySchema = withDateRangeRules(
  z.object(runDateRangeShape)
);

// Dashboard runs additionally accept a hard-capped chart limit so the
// dashboards list page can render a bounded thumbnail per card.
export const RunDashboardQuerySchema = withDateRangeRules(
  z.object({
    ...runDateRangeShape,
    limit: z.coerce.number().int().min(1).max(12).optional(),
  })
);

export const UpdateCustomAnalyticSchema = updateBase.superRefine(
  (value, ctx) => {
    if (
      value.chartType === "TABLE" &&
      value.columnIds !== undefined &&
      value.columnIds.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pick at least one column",
        path: ["columnIds"],
      });
    }

    if (
      value.chartType !== undefined &&
      ["BAR", "PIE"].includes(value.chartType) &&
      value.dimensionType !== undefined
    ) {
      if (
        value.dimensionType === "FIELD" &&
        value.dimensionFieldId !== undefined &&
        !value.dimensionFieldId
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Pick a grouping field",
          path: ["dimensionFieldId"],
        });
      }
      if (
        value.dimensionType === "DATE" &&
        value.dateBucket !== undefined &&
        !value.dateBucket
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Pick a date bucket",
          path: ["dateBucket"],
        });
      }
    }

    if (
      value.metricAggregation !== undefined &&
      value.metricAggregation !== "COUNT" &&
      value.metricFieldId !== undefined &&
      !value.metricFieldId &&
      value.chartType !== undefined &&
      value.chartType !== "TABLE"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a metric field",
        path: ["metricFieldId"],
      });
    }
  }
);
