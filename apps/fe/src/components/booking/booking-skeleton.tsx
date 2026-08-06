import { Skeleton } from "@dashboard/ui/components/skeleton";

// Fixed-length keys so the placeholder rows do not lean on array indexes.
const keys = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

const WEEKDAYS = keys("weekday", 7);
const DATES = keys("date", 35);
const SLOTS = keys("slot", 8);
const PANEL_LINES = keys("line", 3);

// Mirrors the month grid so the calendar does not jump when the real one lands.
export function CalendarSkeleton() {
  return (
    <div className="min-w-[380px] max-w-[400px] shrink-0 space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="size-8" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="size-8" />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((key) => (
          <Skeleton key={key} className="mx-auto h-3 w-6" />
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DATES.map((key) => (
          <Skeleton key={key} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}

// Matches the slot column's own padding and border so the seam stays put.
export function SlotListSkeleton() {
  return (
    <div className="flex w-full shrink-0 flex-col gap-2 border-l p-6">
      {SLOTS.map((key) => (
        <Skeleton key={key} className="h-9 shrink-0 w-full" />
      ))}
    </div>
  );
}

// The whole card while the page itself is still loading: without this the
// invitee sees an empty gradient and cannot tell the link is working.
export function BookingPageSkeleton() {
  return (
    <div className="flex w-full max-w-[1061px] overflow-hidden rounded-[10px] bg-white shadow-lg max-lg:flex-col">
      <aside className="flex w-full shrink-0 flex-col gap-4 bg-[#f4f9ff] p-8 lg:w-[396px]">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-5 w-28" />

        <div className="space-y-2">
          {PANEL_LINES.map((key) => (
            <Skeleton key={key} className="h-4 w-full last:w-2/3" />
          ))}
        </div>

        <Skeleton className="mt-2 h-[51px] w-full rounded-[10px]" />
        <Skeleton className="h-4 w-48" />

        <div className="mt-2 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col p-6">
        <Skeleton className="mb-4 h-8 w-56" />

        <div className="flex rounded-xl border max-md:flex-col">
          <CalendarSkeleton />
          <SlotListSkeleton />
        </div>

        <div className="mt-4 flex items-center gap-4 border-t pt-5">
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </section>
    </div>
  );
}
