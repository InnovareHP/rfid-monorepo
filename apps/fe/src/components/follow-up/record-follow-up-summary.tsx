import { FollowUpCard } from "@/components/follow-up/follow-up-card";
import { getRecordFollowUp } from "@/services/follow-up/follow-up-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

// The same four dates the queue shows, for the record already on screen.
export function RecordFollowUpSummary({ recordId }: { recordId: string }) {
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };

  const { data, isLoading } = useQuery({
    queryKey: ["record-follow-up", recordId],
    queryFn: () => getRecordFollowUp(recordId),
    enabled: !!recordId,
    staleTime: 1000 * 60,
  });

  if (isLoading) return <Skeleton className="h-44 w-full" />;
  if (!data) return null;

  return (
    <FollowUpCard
      row={data}
      team={activeOrganizationId}
      showOpenLink={false}
    />
  );
}
