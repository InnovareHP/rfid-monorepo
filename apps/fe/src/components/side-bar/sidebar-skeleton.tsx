import { Skeleton } from "@dashboard/ui/components/skeleton";

const keys = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

// Holds the rail and panel widths so page content does not shift once the
// organization list lands and the real sidebars mount.
export function SidebarSkeleton() {
  return (
    <>
      <div className="bg-brand-rail sticky top-0 z-50 hidden h-screen w-16 shrink-0 flex-col items-center gap-1 py-4 md:flex">
        <Skeleton className="mb-3 size-9 bg-brand-rail-foreground/20" />
        {keys("rail", 3).map((key) => (
          <Skeleton
            key={key}
            className="size-12 rounded-lg bg-brand-rail-foreground/20"
          />
        ))}
        <Skeleton className="mt-auto size-12 rounded-lg bg-brand-rail-foreground/20" />
      </div>

      <div className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-4 h-4 w-20" />
        {keys("nav", 8).map((key) => (
          <Skeleton key={key} className="h-8 w-full" />
        ))}
        <Skeleton className="mt-auto h-12 w-full" />
      </div>
    </>
  );
}
