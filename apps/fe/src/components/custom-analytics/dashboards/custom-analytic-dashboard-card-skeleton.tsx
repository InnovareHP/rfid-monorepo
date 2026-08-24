import {
  Card,
  CardContent,
  CardHeader,
} from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";

export function CustomAnalyticDashboardCardSkeleton() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-1 h-4 w-20" />
      </CardHeader>
      <CardContent className="px-4">
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}
