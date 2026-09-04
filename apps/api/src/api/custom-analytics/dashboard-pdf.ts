import {
  breakdownTable,
  createReport,
  longDate,
  num,
  percent,
  periodLabel,
} from "../../lib/documents/report-pdf";

// The dashboard result as runDashboard returns it. Typed here rather than
// imported so the renderer states exactly what it reads.
type ChartResult =
  | {
      chartType: "BAR" | "PIE" | "MAP";
      data: { name: string; value: number }[];
    }
  | { chartType: "LINE"; data: { bucket: string; value: number }[] }
  | {
      chartType: "KPI";
      value: number;
      unit?: "percent";
      series: { bucket: string; value: number }[];
    }
  | {
      chartType: "TABLE";
      columns: { id: string; fieldName: string }[];
      rows: { recordName: string; values: Record<string, string | null> }[];
    };

type DashboardRun = {
  name: string;
  charts: { id: string; name: string; result: ChartResult }[];
};

// A record table is a listing, not a summary: past this it stops being a
// report and starts being an export, which the CSV button already does.
const TABLE_ROW_LIMIT = 40;

const kpiValue = (chart: Extract<ChartResult, { chartType: "KPI" }>) =>
  chart.unit === "percent" ? percent(chart.value) : num(chart.value);

export const renderDashboardPdf = async (input: {
  organizationName: string;
  dashboard: DashboardRun;
  startDate?: Date;
  endDate?: Date;
}): Promise<Buffer> => {
  const report = createReport({
    title: input.dashboard.name,
    organizationName: input.organizationName,
    meta: [
      { label: "Period", value: periodLabel(input.startDate, input.endDate) },
      { label: "Charts", value: num(input.dashboard.charts.length) },
      { label: "Generated", value: longDate(new Date()) },
    ],
  });

  // Every headline number on one band, so the document opens the way the
  // dashboard does rather than burying them among the breakdowns.
  const kpis = input.dashboard.charts.filter(
    (chart) => chart.result.chartType === "KPI"
  );

  if (kpis.length) {
    report.sectionTitle("Summary");
    // Four to a band: more than that and the values stop being readable.
    for (let index = 0; index < kpis.length; index += 4) {
      report.statBand(
        kpis.slice(index, index + 4).map((chart) => ({
          label: chart.name,
          value: kpiValue(
            chart.result as Extract<ChartResult, { chartType: "KPI" }>
          ),
        }))
      );
    }
  }

  for (const chart of input.dashboard.charts) {
    const result = chart.result;

    if (result.chartType === "KPI") {
      if (!result.series.length) continue;
      report.sectionTitle(chart.name);
      report.table(
        [
          { header: "Period", width: 408 },
          { header: "Value", width: 108, align: "right" },
        ],
        result.series.map((point) => [
          point.bucket,
          result.unit === "percent" ? percent(point.value) : num(point.value),
        ])
      );
      continue;
    }

    report.sectionTitle(chart.name);

    if (result.chartType === "LINE") {
      if (!result.data.length) {
        report.note("No data in this period.");
        continue;
      }

      report.table(
        [
          { header: "Period", width: 408 },
          { header: "Value", width: 108, align: "right" },
        ],
        result.data.map((point) => [point.bucket, num(point.value)])
      );
      continue;
    }

    if (result.chartType === "TABLE") {
      if (!result.rows.length) {
        report.note("No records in this period.");
        continue;
      }

      // The record name always leads; the rest share what is left, so a chart
      // with many columns still fits the page.
      const rest = result.columns.slice(0, 4);
      const restWidth = rest.length ? Math.floor(276 / rest.length) : 0;
      const columns = [
        { header: "Record", width: 516 - restWidth * rest.length },
        ...rest.map((column) => ({
          header: column.fieldName,
          width: restWidth,
        })),
      ];

      report.table(
        columns,
        result.rows
          .slice(0, TABLE_ROW_LIMIT)
          .map((row) => [
            row.recordName,
            ...rest.map((column) => row.values[column.id] ?? "—"),
          ])
      );

      if (result.rows.length > TABLE_ROW_LIMIT) {
        report.note(
          `${result.rows.length - TABLE_ROW_LIMIT} more rows not shown.`
        );
      }

      if (result.columns.length > rest.length) {
        report.note(
          `${result.columns.length - rest.length} more columns not shown.`
        );
      }

      continue;
    }

    breakdownTable(
      report,
      "Group",
      result.data.map((point) => ({
        name: point.name,
        count: point.value,
      }))
    );
  }

  return await report.finish();
};
