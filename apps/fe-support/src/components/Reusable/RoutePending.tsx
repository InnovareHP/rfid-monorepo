import { Spinner } from "@dashboard/ui/components/spinner";

// Router-wide pending fallback, rendered in the pending route's own outlet slot.
// The floor is a rem value, not a percentage, so it survives an auto-height
// parent as well as a flex column.
export function RoutePending() {
  return (
    <div className="flex min-h-[16rem] flex-1 items-center justify-center p-10">
      <Spinner size="lg" />
    </div>
  );
}
