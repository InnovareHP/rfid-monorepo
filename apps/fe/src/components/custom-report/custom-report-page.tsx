import { PageHeader } from "@/components/page-header";
import {
  ReportTable,
  type ReportColumn,
} from "@/components/reusable-table/report-table";
import { exportToCSV } from "@/lib/fe-helpers";
import {
  deleteReport,
  getReports,
  runReport,
  type ReportRun,
} from "@/services/report/report-service";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileBarChart, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReportBuilderDialog } from "./report-builder-dialog";

const REPORTS_KEY = ["saved-reports"];

type Row = ReportRun["rows"][number];

export default function CustomReportPage() {
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: REPORTS_KEY,
    queryFn: getReports,
  });

  const { data: run, isFetching } = useQuery({
    queryKey: ["saved-report-run", activeId],
    queryFn: () => runReport(activeId!),
    enabled: Boolean(activeId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: (_result, id) => {
      toast.success("Report deleted");
      if (activeId === id) setActiveId(null);
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
    },
    onError: () => toast.error("Failed to delete report"),
  });

  const columns: ReportColumn<Row>[] = [
    {
      key: "recordName",
      header: "Name",
      render: (row) => row.recordName,
    },
    ...(run?.columns ?? []).map((column) => ({
      key: column.id,
      header: column.fieldName,
      render: (row: Row) => row.values[column.id] ?? "—",
    })),
  ];

  const handleExport = () => {
    if (!run) return;

    exportToCSV(
      run.rows.map((row) => ({
        Name: row.recordName,
        ...Object.fromEntries(
          run.columns.map((column) => [
            column.fieldName,
            row.values[column.id] ?? "",
          ])
        ),
      })),
      ["Name", ...run.columns.map((column) => column.fieldName)],
      run.report.name
    );
  };

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Custom Reports"
          description="Save a view of any module and come back to it."
        />

        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {reports.map((report) => (
          <div
            key={report.id}
            className={
              report.id === activeId
                ? "flex items-center gap-2 rounded-lg border border-brand bg-muted px-3 py-2"
                : "flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            }
          >
            <button
              type="button"
              className="flex items-center gap-2 text-sm"
              onClick={() => {
                setActiveId(report.id);
                setPage(1);
              }}
            >
              <FileBarChart className="h-4 w-4" />
              {report.name}
              <span className="text-muted-foreground">
                {report.module.label}
              </span>
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(report.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {!isLoading && reports.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No saved reports yet. Create one to get started.
          </p>
        )}
      </div>

      {activeId && (
        <>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleExport} disabled={!run}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <ReportTable
            columns={columns}
            rows={(run?.rows ?? []).slice(
              (page - 1) * pageSize,
              page * pageSize
            )}
            isLoading={isFetching}
            emptyMessage="This report matched no records"
            currentPage={page}
            pageSize={pageSize}
            totalCount={run?.rows.length ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}

      <ReportBuilderDialog open={builderOpen} onOpenChange={setBuilderOpen} />
    </div>
  );
}
