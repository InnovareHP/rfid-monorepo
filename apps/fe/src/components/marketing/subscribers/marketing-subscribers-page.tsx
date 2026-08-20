import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import {
  deleteSubscriber,
  getSubscribers,
  resubscribeSubscriber,
  unsubscribeSubscriber,
  type EmailSubscriber,
} from "@/services/marketing/subscriber-service";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../../analytics/charts/kpi-stat-tile";
import { MarketingSubNav } from "../marketing-sub-nav";
import { SubscriberCreateDialog } from "./subscriber-create-dialog";
import { SubscriberListTable } from "./subscriber-list-table";

export const MarketingSubscribersPage = () => {
  const queryClient = useQueryClient();

  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canEdit = can(memberData?.role, { outreach: ["update"] });

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-subscribers", search, page, pageSize],
    queryFn: () => getSubscribers({ search, page, limit: pageSize }),
  });

  const subscribers = data?.subscribers ?? [];

  const statusMutation = useMutation({
    mutationFn: (subscriber: EmailSubscriber) =>
      subscriber.status === "SUBSCRIBED"
        ? unsubscribeSubscriber(subscriber.id)
        : resubscribeSubscriber(subscriber.id),
    onSuccess: (updated) => {
      toast.success(
        updated.status === "SUBSCRIBED" ? "Resubscribed" : "Unsubscribed"
      );
      queryClient.invalidateQueries({ queryKey: ["marketing-subscribers"] });
    },
    onError: () => toast.error("Failed to update subscriber"),
  });

  const deleteMutation = useMutation({
    mutationFn: (subscriber: EmailSubscriber) => deleteSubscriber(subscriber.id),
    onSuccess: () => {
      toast.success("Subscriber deleted");
      queryClient.invalidateQueries({ queryKey: ["marketing-subscribers"] });
    },
    onError: () => toast.error("Failed to delete subscriber"),
  });

  const subscribedCount = subscribers.filter(
    (subscriber) => subscriber.status === "SUBSCRIBED"
  ).length;
  const unsubscribedCount = subscribers.length - subscribedCount;

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Subscribers"
          description="Everyone who opted in to marketing email, and everyone who opted out."
        />

        {canEdit && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="size-4" />
            Add Subscriber
          </Button>
        )}
      </div>

      <MarketingSubNav active="subscribers" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiStatTile
          label="Total"
          value={(data?.total ?? 0).toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Subscribed"
          value={subscribedCount.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Unsubscribed"
          value={unsubscribedCount.toLocaleString()}
          isLoading={isLoading}
        />
      </div>

      <Input
        placeholder="Search subscribers...."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="w-full bg-card sm:w-80"
      />

      <SubscriberListTable
        subscribers={subscribers}
        canEdit={canEdit}
        isLoading={isLoading}
        currentPage={page}
        pageSize={pageSize}
        totalCount={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onToggleStatus={(subscriber) => statusMutation.mutate(subscriber)}
        onDelete={(subscriber) => deleteMutation.mutate(subscriber)}
      />

      <SubscriberCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};
