import { Skeleton } from "@dashboard/ui/components/skeleton";

const keys = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

// Mirrors the form and landing-page builders: top bar, canvas card, right panel.
export function BuilderPageSkeleton({ blocks = 4 }: { blocks?: number }) {
  return (
    <div className="flex min-h-full flex-col bg-muted">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex-1 p-8">
          <div className="mx-auto w-full max-w-2xl space-y-4 rounded-xl bg-card px-7 py-12 shadow-sm">
            <Skeleton className="h-7 w-48" />
            {keys("block", blocks).map((key) => (
              <div key={key} className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-3 border-l border-border bg-card p-4 lg:w-80">
          <Skeleton className="h-5 w-32" />
          {keys("panel", 5).map((key) => (
            <Skeleton key={key} className="h-9 w-full" />
          ))}
        </aside>
      </div>
    </div>
  );
}

// The blast editor is a stepped form inside page-style, not a canvas builder.
export function StepFormPageSkeleton({ steps = 3 }: { steps?: number }) {
  return (
    <div className="page-style">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {keys("step", steps).map((key) => (
        <div key={key} className="space-y-4 rounded-xl border bg-card p-6">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
