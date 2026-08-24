import { Button } from "@dashboard/ui/components/button";
import { AlertCircle, BarChart3, Loader2, RefreshCcw } from "lucide-react";

export function AnalyticsLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="mb-4 size-12 animate-spin text-brand" />
      <p className="font-medium text-brand">Loading analytics data...</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This may take a moment
      </p>
    </div>
  );
}

export function AnalyticsError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-4 text-center sm:p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="size-8 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-900">
            Failed to Load Data
          </h3>
          <p className="mt-1 text-red-700">{message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try again or contact support if the problem persists.
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4 rounded-lg border-red-300 hover:bg-red-50"
        >
          <RefreshCcw className="size-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
    </div>
  );
}

export function AnalyticsEmpty() {
  return (
    <div className="rounded-2xl border bg-white p-6 text-center sm:p-12">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-20 items-center justify-center rounded-full bg-brand/5">
          <BarChart3 className="size-10 text-brand" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            No Data Available
          </h3>
          <p className="mt-1 text-muted-foreground">
            No analytics data found for the selected filters.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your date range or selecting a different liaison.
          </p>
        </div>
      </div>
    </div>
  );
}
