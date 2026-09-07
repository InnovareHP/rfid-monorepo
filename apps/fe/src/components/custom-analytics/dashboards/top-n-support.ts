import type { CustomAnalyticChartType } from "@/services/custom-analytics/custom-analytics-service";

// Only BAR and PIE consult groupLimit; on any other chart type the control
// would be a dead affordance.
const RANKED_CHART_TYPES: CustomAnalyticChartType[] = ["BAR", "PIE"];

// A chart named "Top 10 Referring Facilities" claims a rank in its own title,
// which is the only signal that cutting it shorter is meaningful.
const NAMES_A_RANK = /\btop\b/i;

export const supportsTopN = (
  name: string,
  chartType: CustomAnalyticChartType
) => NAMES_A_RANK.test(name) && RANKED_CHART_TYPES.includes(chartType);
