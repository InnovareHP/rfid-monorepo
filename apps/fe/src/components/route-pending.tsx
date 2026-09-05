import { Spinner } from "@dashboard/ui/components/spinner";

// Router-wide pending fallback. It renders in the pending route's own outlet
// slot, so inside _team the sidebar stays mounted and only the content swaps.
// The floor is a rem value, not a percentage: this sits in both a flex column
// and an auto-height parent, and a percentage collapses in the second.
export function RoutePending() {
  return (
    <div className="flex min-h-[16rem] flex-1 items-center justify-center p-10">
      <Spinner size="lg" />
    </div>
  );
}
