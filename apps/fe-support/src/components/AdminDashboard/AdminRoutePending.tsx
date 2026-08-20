import { Spinner } from "@dashboard/ui/components/spinner";

export function AdminRoutePending() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Spinner className="text-muted-foreground h-8 w-8" />
    </div>
  );
}
