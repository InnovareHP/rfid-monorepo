import { AnalyticsService } from "../src/api/analytics/analytics.service";
import { CustomAnalyticsService } from "../src/api/custom-analytics/custom-analytics.service";
import { PreviewCustomAnalyticDto } from "../src/api/custom-analytics/dto/custom-analytics.dto";
import { resolveModuleId } from "../src/lib/module/system-modules";
import { prisma } from "../src/lib/prisma/prisma";
import { runWithTenant } from "../src/lib/prisma/tenant-context";

// Runs every hardcoded analytics metric and its generic replacement over the
// same organization and window, and prints where they disagree. This is the
// evidence step E needs before any legacy method is deleted.
//
// Usage: pnpm --filter api verify:analytics-parity <organizationId> [days]

const [organizationId, daysArg] = process.argv.slice(2);
const RANGE_DAYS = Number(daysArg ?? 365);

// The metric methods only read Board, FieldValue, History and BoardRelation.
// Constructing the service normally would open a Redis-backed queue this
// script never uses, so the prototype is used directly.
const legacyService: AnalyticsService = Object.create(
  AnalyticsService.prototype
);
// The queue is only used to generate AI insights, which this script never
// asks for, so it is never touched.
const genericService = new CustomAnalyticsService(null as never);

type Row = { name: string; value: number };

const round = (value: number) => Number(value.toFixed(1));

// The legacy shapes are unknown at this point, so only a primitive becomes a
// label; an object would otherwise stringify to [object Object] and every row
// would collide under one name.
const label = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

// Each legacy metric returns its own row shape, so the label and the number are
// picked from whichever keys that metric happened to use.
const asRows = (result: unknown): Row[] => {
  if (!Array.isArray(result)) return [];

  return result
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const name =
        row.value ??
        row.status ??
        row.facility ??
        row.sourceName ??
        row.month ??
        row.reason ??
        row.name ??
        "";
      // averageDays before count: getAverageTimeByStatus carries both, and the
      // number being compared there is the duration, not how many changes made
      // it up.
      const count =
        (row._count as { value: number } | undefined)?.value ??
        row.averageDays ??
        row.count ??
        row.total ??
        row.recent_referrals ??
        row.referralCount ??
        0;

      return { name: label(name), value: round(Number(count)) };
    })
    .filter((row) => row.name !== "")
    .sort((a, b) => a.name.localeCompare(b.name));
};

const genericRows = (result: unknown): Row[] => {
  const typed = result as { chartType: string; data?: unknown; value?: number };

  if (typed.chartType === "KPI") {
    return [{ name: "value", value: round(typed.value ?? 0) }];
  }

  return ((typed.data ?? []) as Record<string, unknown>[])
    .map((row) => ({
      name: label(row.name ?? row.bucket),
      value: round(Number(row.value ?? 0)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const diff = (legacy: Row[], generic: Row[]) => {
  const byName = new Map(generic.map((row) => [row.name, row.value]));
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const row of legacy) {
    seen.add(row.name);
    const other = byName.get(row.name);
    if (other === undefined) {
      lines.push("  only legacy: " + row.name + " = " + row.value);
    } else if (other !== row.value) {
      lines.push(
        "  " + row.name + ": legacy " + row.value + ", generic " + other
      );
    }
  }

  for (const row of generic) {
    if (!seen.has(row.name)) {
      lines.push("  only generic: " + row.name + " = " + row.value);
    }
  }

  return lines;
};

const previewDto = (
  moduleId: string,
  overrides: Record<string, unknown>
): PreviewCustomAnalyticDto =>
  ({
    moduleId,
    chartType: "BAR",
    metricFieldId: null,
    metricAggregation: "COUNT",
    dimensionType: "FIELD",
    dimensionFieldId: null,
    dateBucket: "MONTH",
    columnIds: [],
    filter: { match: "AND", conditions: [] },
    rangeDays: null,
    groupLimit: 50,
    numeratorFilter: { match: "AND", conditions: [] },
    minGroupSize: null,
    maxGroupSize: null,
    relationType: null,
    relationDirection: "OUTGOING",
    relatedFieldId: null,
    metricSource: "FIELD_VALUE",
    durationFieldId: null,
    ...overrides,
  }) as unknown as PreviewCustomAnalyticDto;

async function main() {
  if (!organizationId) {
    console.error("Usage: verify-analytics-parity <organizationId> [days]");
    process.exit(1);
  }

  const endDate = new Date();
  const startDate = new Date(Date.now() - RANGE_DAYS * 86_400_000);

  await runWithTenant(organizationId, async () => {
    const [referralModuleId, leadModuleId] = await Promise.all([
      resolveModuleId("REFERRAL", organizationId),
      resolveModuleId("LEAD", organizationId),
    ]);

    const fields = await prisma.field.findMany({
      where: { organizationId, isDeleted: false },
      select: { id: true, fieldName: true, moduleId: true },
    });

    const fieldId = (moduleId: string, fieldName: string) =>
      fields.find(
        (field) => field.moduleId === moduleId && field.fieldName === fieldName
      )?.id ?? null;

    const referralField = (name: string) => fieldId(referralModuleId, name);

    // Every check names the legacy metric it replaces, so a mismatch points at
    // one method rather than at "analytics".
    const checks: {
      name: string;
      legacy: () => Promise<unknown>;
      generic: () => Promise<unknown>;
      expected?: string;
    }[] = [
      {
        name: "getStatusBreakdown -> PIE on Status",
        legacy: () =>
          legacyService.getStatusBreakdown(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              chartType: "PIE",
              dimensionFieldId: referralField("Admission Status"),
            }),
            organizationId
          ),
        expected:
          "generic adds an Unknown bucket for referrals with no Status value",
      },
      {
        name: "getPayerMix -> PIE on Payor",
        legacy: () =>
          legacyService.getPayerMix(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              chartType: "PIE",
              dimensionFieldId: referralField("Payor"),
            }),
            organizationId
          ),
        expected: "generic adds an Unknown bucket",
      },
      {
        name: "getAssessmentTypeBreakdown -> PIE on Type of Assessment",
        legacy: () =>
          legacyService.getAssessmentTypeBreakdown(
            organizationId,
            startDate,
            endDate
          ),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              chartType: "PIE",
              dimensionFieldId: referralField("Type of Assessment"),
            }),
            organizationId
          ),
        expected: "generic adds an Unknown bucket",
      },
      {
        name: "getOutreachImpact -> LINE by month",
        legacy: () =>
          legacyService.getOutreachImpact(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, { chartType: "LINE" }),
            organizationId
          ),
      },
      {
        name: "getTopClinicians -> BAR on Contact",
        legacy: () =>
          legacyService.getTopClinicians(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              dimensionFieldId: referralField("Contact"),
              groupLimit: 10,
            }),
            organizationId
          ),
        expected: "legacy takes the top 10, which groupLimit matches",
      },
      {
        name: "getTopFacilities -> BAR on the linked lead",
        legacy: () =>
          legacyService.getTopFacilities(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              dimensionType: "RELATED_RECORD",
              relationType: "REFERRAL_LINK",
              groupLimit: 10,
            }),
            organizationId
          ),
      },
      {
        name: "getTopCounties -> BAR on the linked lead's County",
        legacy: () =>
          legacyService.getTopCounties(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              dimensionType: "RELATED_RECORD",
              relationType: "REFERRAL_LINK",
              relatedFieldId: fieldId(leadModuleId, "County"),
            }),
            organizationId
          ),
      },
      {
        name: "getEmergingSources -> BAR with a max group size",
        legacy: () =>
          legacyService.getEmergingSources(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              dimensionType: "RELATED_RECORD",
              relationType: "REFERRAL_LINK",
              maxGroupSize: 4,
            }),
            organizationId
          ),
        expected: "legacy keeps sources with fewer than 5 referrals",
      },
      {
        name: "getAverageTimeByStatus -> BAR of days to change",
        legacy: () =>
          legacyService.getAverageTimeByStatus(
            organizationId,
            startDate,
            endDate
          ),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              metricSource: "DAYS_TO_CHANGE",
              durationFieldId: referralField("Admission Status"),
              metricAggregation: "AVG",
            }),
            organizationId
          ),
      },
      {
        name: "getAvgTimeTrend -> LINE of days to change",
        legacy: () =>
          legacyService.getAvgTimeTrend(organizationId, startDate, endDate),
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              chartType: "LINE",
              metricSource: "DAYS_TO_CHANGE",
              durationFieldId: referralField("Admission Status"),
              metricAggregation: "AVG",
            }),
            organizationId
          ),
      },
      {
        name: "getConversionRate -> KPI percentage",
        legacy: async () => {
          const conversion = await legacyService.getConversionRate(
            organizationId,
            startDate,
            endDate
          );
          return [{ value: "value", count: conversion.conversionRate }];
        },
        generic: () =>
          genericService.previewAnalytic(
            previewDto(referralModuleId, {
              chartType: "KPI",
              metricAggregation: "PERCENT",
              numeratorFilter: {
                match: "AND",
                conditions: [
                  {
                    fieldId: referralField("Admission Status"),
                    operator: "eq",
                    value: "Admitted",
                  },
                ],
              },
            }),
            organizationId
          ),
      },
    ];

    let mismatched = 0;

    for (const check of checks) {
      try {
        const [legacy, generic] = await Promise.all([
          check.legacy(),
          check.generic(),
        ]);

        const lines = diff(asRows(legacy), genericRows(generic));

        if (lines.length === 0) {
          console.log("MATCH    " + check.name);
          continue;
        }

        mismatched += 1;
        console.log("DIFFERS  " + check.name);
        if (check.expected) console.log("  expected: " + check.expected);
        for (const line of lines.slice(0, 12)) console.log(line);
        if (lines.length > 12) {
          console.log("  ...and " + (lines.length - 12) + " more");
        }
      } catch (error) {
        mismatched += 1;
        console.log("ERROR    " + check.name);
        console.log("  " + (error as Error).message);
      }
    }

    console.log(
      "\n" +
        (checks.length - mismatched) +
        "/" +
        checks.length +
        " metrics matched over the last " +
        RANGE_DAYS +
        " days."
    );
  });

  await prisma.$disconnect();
}

void main();
