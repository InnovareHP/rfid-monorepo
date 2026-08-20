import { Card, CardContent } from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";

// Fixed-length keys so placeholder rows do not lean on array indexes.
const keys = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

// Mirrors PageHeader: title, optional description, right-aligned actions.
export function PageHeaderSkeleton({
  withDescription = true,
  actions = 1,
}: {
  withDescription?: boolean;
  actions?: number;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 sm:h-10 sm:w-72" />
        {withDescription && <Skeleton className="h-4 w-80 max-w-full" />}
      </div>
      {actions > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {keys("action", actions).map((key) => (
            <Skeleton key={key} className="h-9 w-32" />
          ))}
        </div>
      )}
    </div>
  );
}

// Mirrors the KpiStatTile row: bordered cards with a label line and a big value.
export function KpiStripSkeleton({
  tiles = 3,
  withChart = false,
}: {
  tiles?: number;
  withChart?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 ${
        tiles === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"
      }`}
    >
      {keys("tile", tiles).map((key) => (
        <Card key={key} className="gap-0 rounded-2xl border py-5 shadow-sm">
          <CardContent className="flex h-full flex-col px-5 py-0">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-1 mb-3 h-10 w-24" />
            {withChart && <Skeleton className="mt-auto h-48 w-full" />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Header row plus body rows, matching the reusable table's row height.
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden p-0">
      <CardContent
        className="space-y-3 p-4"
        aria-busy="true"
        aria-label="Loading rows"
      >
        <Skeleton className="h-9 w-full" />
        {keys("row", rows).map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// The shape every marketing/list route shares: header, stats, search, table.
export function ListPageSkeleton({
  tiles = 3,
  rows = 8,
  withSubNav = false,
}: {
  tiles?: number;
  rows?: number;
  withSubNav?: boolean;
}) {
  return (
    <div className="page-style">
      <PageHeaderSkeleton />
      {withSubNav && <Skeleton className="h-10 w-full max-w-md" />}
      <KpiStripSkeleton tiles={tiles} />
      <Skeleton className="h-9 w-full sm:w-80" />
      <TableSkeleton rows={rows} />
    </div>
  );
}

// Stacked settings cards: a title line, a few fields, a trailing action.
export function SettingsCardSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        {keys("field", fields).map((key) => (
          <div key={key} className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </CardContent>
    </Card>
  );
}

export function SettingsPageSkeleton({
  cards = 2,
  className = "page-style",
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <PageHeaderSkeleton actions={0} />
      {keys("card", cards).map((key) => (
        <SettingsCardSkeleton key={key} />
      ))}
    </div>
  );
}

// Back button, title and prose blocks: help articles and other read views.
export function DetailPageSkeleton({ blocks = 4 }: { blocks?: number }) {
  return (
    <div className="page-style">
      <Skeleton className="h-8 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="space-y-3">
        {keys("block", blocks).map((key) => (
          <Skeleton key={key} className="h-4 w-full last:w-2/3" />
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  cards = 6,
  columns = 3,
}: {
  cards?: number;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={`grid gap-6 sm:grid-cols-2 ${
        columns === 3 ? "lg:grid-cols-3" : ""
      }`}
    >
      {keys("card", cards).map((key) => (
        <Skeleton key={key} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}

// Router-level fallback: page chrome only, since the route shape is not known yet.
export function RoutePendingSkeleton() {
  return (
    <div className="page-style">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-full sm:w-80" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

// Rows inside an existing Card body, matching HelpArticleRow's padded height.
export function ListRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy="true">
      {keys("row", rows).map((key) => (
        <div key={key} className="space-y-2 px-6 py-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// A public page with no app chrome: hero band then stacked content sections.
export function PublicPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-64 w-full rounded-none" />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <Skeleton className="h-8 w-2/3" />
        <div className="space-y-3">
          {keys("line", 5).map((key) => (
            <Skeleton key={key} className="h-4 w-full last:w-1/2" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Label plus input pairs, for a record form whose fields are still unknown.
export function FormFieldsSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {keys("field", fields).map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
