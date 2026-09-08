import { FollowUpCard } from "@/components/follow-up/follow-up-card";
import { PageHeader } from "@/components/page-header";
import { useModules } from "@/hooks/use-modules";
import {
  followUpBucket,
  followUpWindow,
  type FollowUpBucket,
} from "@/lib/helper/follow-up-date";
import {
  getFollowUpDigest,
  type FollowUpRow,
} from "@/services/follow-up/follow-up-service";
import { listMembers } from "@/services/team/team-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";

const ANY = "__any__";
const PAGE_LIMIT = 25;

const SECTIONS: { bucket: FollowUpBucket; title: string }[] = [
  { bucket: "overdue", title: "Overdue" },
  { bucket: "today", title: "Today" },
  { bucket: "week", title: "This week" },
];

export function FollowUpPage() {
  const { activeOrganizationId, user } = useRouteContext({
    from: "__root__",
  }) as { activeOrganizationId: string; user: { id: string } | null };

  const [moduleType, setModuleType] = useState(ANY);
  // Yours is the view you act on; the whole team is a deliberate widening.
  const [assignedTo, setAssignedTo] = useState(user?.id ?? ANY);

  const { data: modules = [] } = useModules();
  const { data: memberList } = useQuery({
    queryKey: ["team-members", "follow-ups"],
    queryFn: () => listMembers({ page: 1, limit: 100, search: "" }),
    staleTime: 1000 * 60 * 30,
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["follow-ups", moduleType, assignedTo],
      queryFn: ({ pageParam }) =>
        getFollowUpDigest({
          ...followUpWindow(),
          moduleType: moduleType === ANY ? undefined : moduleType,
          assignedTo: assignedTo === ANY ? undefined : assignedTo,
          page: pageParam,
          limit: PAGE_LIMIT,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
      staleTime: 1000 * 60,
    });

  const rows: FollowUpRow[] = data?.pages.flatMap((page) => page.data) ?? [];
  const buckets = data?.pages[0]?.buckets ?? null;

  // Header totals come from the server; the cards under them are whatever has
  // been loaded so far, and rows arrive earliest first.
  const bucketTotal = (bucket: FollowUpBucket) =>
    bucket === "overdue"
      ? buckets?.overdue
      : bucket === "today"
        ? buckets?.today
        : buckets?.upcoming;

  const grouped = SECTIONS.map((section) => ({
    ...section,
    total: bucketTotal(section.bucket),
    rows: rows.filter(
      (row) =>
        row.followUp && followUpBucket(row.followUp.dueDate) === section.bucket
    ),
  }));

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader
          title="Follow-ups"
          description="Every record with an open follow-up due in the next week."
        >
          <Select value={moduleType} onValueChange={setModuleType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All modules</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module.key} value={module.key}>
                  {module.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Anyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Everyone</SelectItem>
              {(memberList?.members ?? []).map((member) => (
                <SelectItem key={member.user.id} value={member.user.id}>
                  {member.user.id === user?.id ? "Me" : member.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageHeader>

        {isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is due in the next week.
          </p>
        ) : (
          <div className="space-y-8">
            {grouped
              .filter((section) => section.rows.length > 0)
              .map((section) => (
                <section key={section.bucket} className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    {section.title}
                    <span className="ml-2 text-muted-foreground">
                      {section.total ?? section.rows.length}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {section.rows.map((row) => (
                      <FollowUpCard
                        key={row.recordId}
                        row={row}
                        team={activeOrganizationId}
                      />
                    ))}
                  </div>
                </section>
              ))}

            {hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? <Spinner className="h-4 w-4" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
