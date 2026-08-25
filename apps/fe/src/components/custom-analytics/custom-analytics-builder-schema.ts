import { z } from "zod";

export const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    moduleId: z.string().min(1, "Pick a module"),
    chartType: z.enum(["BAR", "LINE", "PIE", "KPI", "TABLE"]),
    metricFieldId: z.string(),
    metricAggregation: z.enum(["SUM", "AVG", "COUNT", "MIN", "MAX"]),
    dimensionType: z.enum(["FIELD", "OWNER", "DATE"]),
    dimensionFieldId: z.string(),
    dateBucket: z.enum(["DAY", "WEEK", "MONTH"]),
    columnIds: z.array(z.string()),
    range: z.string(),
    filterFieldId: z.string(),
    filterValue: z.string(),
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
      ["BAR", "PIE"].includes(values.chartType) &&
      values.dimensionType === "FIELD" &&
      !values.dimensionFieldId
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a grouping field",
        path: ["dimensionFieldId"],
      });
    }
    if (
      values.metricAggregation !== "COUNT" &&
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
