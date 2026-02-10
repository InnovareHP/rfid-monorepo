import { Skeleton } from "./skeleton";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 md:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-24" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>
    </div>
  );
}
