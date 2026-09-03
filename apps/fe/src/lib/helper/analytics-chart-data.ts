import { sequentialRampColor } from "@/lib/color-utils";
import type {
  AnalyticsResponse,
  MasterListAnalyticsResponse,
} from "@dashboard/shared";
import { format, parseISO } from "date-fns";

export type CategoryRow = {
  name: string;
  value: number;
  // The grouped field option's own colour, when the source has one.
  color?: string;
};

export type RankedRow = {
  name: string;
  count: number;
};

export type MonthlyPoint = {
  month: string;
  label: string;
  total: number;
};

export type StatusSlice = {
  status: string;
  count: number;
  color: string;
  share: number;
};

export type DenialCategory =
  | "Insurance"
  | "Capacity"
  | "Admin"
  | "Eligibility"
  | "Clinical"
  | "Other";

export type DenialReasonRow = {
  name: string;
  count: number;
  category: DenialCategory;
};

export type TrendDelta = {
  percent: number;
  direction: "up" | "down" | "flat";
  // Set when the prior period was zero: a percentage off a zero baseline is
  // undefined, so the tile reports the absolute change instead.
  absolute?: number;
};

type CountedItem = {
  value: string | null;
  _count: { value: number };
};

const UNKNOWN = "Unknown";

function toCategoryRows(items: CountedItem[] | undefined): CategoryRow[] {
  return (items ?? []).map((item) => ({
    name: item.value ?? UNKNOWN,
    value: item._count.value,
  }));
}

function toRankedRows(
  items: CountedItem[] | undefined,
  limit: number
): RankedRow[] {
  return (items ?? [])
    .map((item) => ({ name: item.value ?? UNKNOWN, count: item._count.value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function toMonthlyPoints(
  points: { month: string; total: number }[] | undefined
): MonthlyPoint[] {
  return (points ?? []).map((point) => ({
    month: point.month,
    label: format(parseISO(`${point.month}-01`), "MMM"),
    total: point.total,
  }));
}

// Canonical pipeline statuses always listed, in order, with fixed colors.
const CANONICAL_STATUS_COLORS: [string, string][] = [
  ["New", "#64d1f4"],
  ["In Progress", "#2c86d9"],
  ["Converted", "#0d3185"],
  ["Closed", "#6b7280"],
  ["Denied", "#1f2937"],
];

const CANONICAL_KEYS = new Set(
  CANONICAL_STATUS_COLORS.map(([status]) => status.toLowerCase())
);

export function toStatusSlices(
  analytics: AnalyticsResponse | undefined
): StatusSlice[] {
  const items = analytics?.statusBreakdown ?? [];
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) return [];

  // Counts keyed lowercase so canonical names survive casing differences.
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = (item.status.trim() || "No status").toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + item.count);
  }

  const canonical = CANONICAL_STATUS_COLORS.map(([status, color]) => ({
    status,
    color,
    count: counts.get(status.toLowerCase()) ?? 0,
  }));

  const extras = items
    .map((item) => item.status.trim() || "No status")
    .filter((status, index, all) => all.indexOf(status) === index)
    .filter((status) => !CANONICAL_KEYS.has(status.toLowerCase()))
    .sort(
      (a, b) =>
        (counts.get(b.toLowerCase()) ?? 0) - (counts.get(a.toLowerCase()) ?? 0)
    );

  return [
    ...canonical,
    ...extras.map((status, index) => ({
      status,
      color: sequentialRampColor(index, extras.length),
      count: counts.get(status.toLowerCase()) ?? 0,
    })),
  ].map((row) => ({ ...row, share: (row.count / total) * 100 }));
}

const DENIAL_CATEGORY_KEYWORDS: [DenialCategory, string[]][] = [
  [
    "Insurance",
    [
      "insurance",
      "authorization",
      "auth",
      "payer",
      "coverage",
      "medicaid",
      "medicare",
      "benefit",
    ],
  ],
  ["Capacity", ["bed", "capacity", "full", "staffing", "no room", "waitlist"]],
  [
    "Admin",
    [
      "duplicate",
      "paperwork",
      "document",
      "incomplete",
      "missing",
      "admin",
      "record",
    ],
  ],
  [
    "Eligibility",
    ["eligib", "not eligible", "criteria", "age", "residency", "county"],
  ],
  [
    "Clinical",
    ["clinical", "acuity", "diagnosis", "behavior", "medical", "care level"],
  ],
];

export function categorizeDenialReason(reason: string): DenialCategory {
  const text = reason.toLowerCase();

  for (const [category, keywords] of DENIAL_CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }

  return "Other";
}

export function monthOverMonthDelta(
  points: MonthlyPoint[]
): TrendDelta | undefined {
  if (points.length < 2) return undefined;

  const previous = points[points.length - 2].total;
  const latest = points[points.length - 1].total;

  if (previous === 0) return undefined;

  const percent = ((latest - previous) / previous) * 100;

  return {
    percent: Math.abs(percent),
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
  };
}

export function countDelta(
  current: number,
  previous: number
): TrendDelta | undefined {
  if (previous === 0) {
    if (current === 0) return { percent: 0, direction: "flat" };

    return { percent: 0, direction: "up", absolute: current };
  }

  const percent = ((current - previous) / previous) * 100;

  return {
    percent: Math.abs(percent),
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
  };
}

export function weightedAverageDays(
  analytics: AnalyticsResponse | undefined
): number {
  const items = analytics?.avgTimeByStatus ?? [];
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  if (totalCount === 0) return 0;

  const weighted = items.reduce(
    (sum, item) => sum + Number(item.averageDays) * item.count,
    0
  );

  return weighted / totalCount;
}

export function formatDays(days: number): string {
  const rounded = Number(days.toFixed(1));
  const value = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return `${value} ${rounded === 1 ? "Day" : "Days"}`;
}

export function buildAnalyticsChartData(
  analytics: AnalyticsResponse | undefined
) {
  const referralTrend = toMonthlyPoints(analytics?.discharge);
  const denialTrend = toMonthlyPoints(analytics?.denials?.monthlyTrend);
  const convertedTrend = toMonthlyPoints(
    analytics?.conversion?.monthlyAdmitted
  );
  const conversionRateTrend = toMonthlyPoints(
    analytics?.conversion?.monthlyRate
  );
  const avgTimeTrend = toMonthlyPoints(analytics?.avgTimeTrend);

  return {
    facilities: toRankedRows(analytics?.facilities, 10),
    clinicians: toRankedRows(analytics?.clinicians, 10),
    counties: toRankedRows(analytics?.counties, 10),
    payers: toCategoryRows(analytics?.payers),
    sources: toCategoryRows(analytics?.sources),
    admissionTypes: toCategoryRows(analytics?.admissionTypes),
    statusSlices: toStatusSlices(analytics),
    referralTrend,
    denialTrend,
    convertedTrend,
    conversionRateTrend,
    avgTimeTrend,
    referralTrendDelta: monthOverMonthDelta(referralTrend),
    denialTrendDelta: monthOverMonthDelta(denialTrend),
    convertedDelta: monthOverMonthDelta(convertedTrend),
    conversionRateDelta: monthOverMonthDelta(conversionRateTrend),
    avgTimeDelta: monthOverMonthDelta(avgTimeTrend),
    denialReasons: (analytics?.denials?.reasons ?? [])
      .map<DenialReasonRow>((reason) => ({
        name: reason.reason,
        count: reason.count,
        category: categorizeDenialReason(reason.reason),
      }))
      .sort((a, b) => b.count - a.count),
    emergingSources: analytics?.outreach ?? [],
    scorecard: analytics?.scorecard ?? [],
    avgDays: weightedAverageDays(analytics),
  };
}

// The facility pipeline is org-defined, so its slices keep the option colours
// the board itself uses rather than the referral page's canonical statuses.
export function toMasterListStatusSlices(
  analytics: MasterListAnalyticsResponse | undefined
): StatusSlice[] {
  const items = analytics?.statusBreakdown ?? [];
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) return [];

  return items.map((item, index) => ({
    status: item.status,
    count: item.count,
    color: item.color ?? sequentialRampColor(index, items.length),
    share: (item.count / total) * 100,
  }));
}

export function buildMasterListChartData(
  analytics: MasterListAnalyticsResponse | undefined
) {
  const growthTrend = toMonthlyPoints(analytics?.growthTrend);

  return {
    growthTrend,
    growthDelta: monthOverMonthDelta(growthTrend),
    statusSlices: toMasterListStatusSlices(analytics),
    facilityTypes: toCategoryRows(analytics?.facilityTypes),
    counties: toRankedRows(analytics?.counties, 10),
    byLiaison: toRankedRows(analytics?.byLiaison, 10),
    topReferringFacilities: toRankedRows(analytics?.topReferringFacilities, 10),
  };
}
