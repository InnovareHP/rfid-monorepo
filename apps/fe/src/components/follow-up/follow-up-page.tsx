import { FollowUpCard } from "@/components/follow-up/follow-up-card";
import { PageHeader } from "@/components/page-header";
import { useModules } from "@/hooks/use-modules";
import {
  followUpBucket,
  followUpWindowEnd,
  type FollowUpBucket,
} from "@/lib/helper/follow-up-date";
import {
  getFollowUpDigest,
  type FollowUpRow,
} from "@/services/follow-up/follow-up-service";
import { listMembers } from "@/services/team/team-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";

const ANY = "__any__";
const PAGE_LIMIT = 100;

const SECTIONS: { bucket: FollowUpBucket; title: string }[] = [
  { bucket: "overdue", title: "Overdue" },
  { bucket: "today", title: "Today" },
  { bucket: "week", title: "This week" },
];

export function FollowUpPage() {
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };

  const [moduleType, setModuleType] = useState(ANY);
  const [assignedTo, setAssignedTo] = useState(ANY);

  const { data: modules = [] } = useModules();
  const { data: memberList } = useQuery({
    queryKey: ["team-members", "follow-ups"],
    queryFn: () => listMembers({ page: 1, limit: 100, search: "" }),
    staleTime: 1000 * 60 * 30,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["follow-ups", moduleType, assignedTo],
    queryFn: () =>
      getFollowUpDigest({
        moduleType: moduleType === ANY ? undefined : moduleType,
        assignedTo: assignedTo === ANY ? undefined : assignedTo,
        dueBefore: followUpWindowEnd(),
        limit: PAGE_LIMIT,
      }),
    staleTime: 1000 * 60,
  });

  const rows = data?.data ?? [];
  const grouped = SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter(
      (row: FollowUpRow) =>
        row.followUp && followUpBucket(row.followUp.dueDate) === section.bucket
    ),
  }));

  const hidden = (data?.pagination.count ?? 0) - rows.length;

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
              <SelectItem value={ANY}>Anyone</SelectItem>
              {(memberList?.members ?? []).map((member) => (
                <SelectItem key={member.user.id} value={member.user.id}>
                  {member.user.name}
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
                      {section.rows.length}
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

            {hidden > 0 && (
              <p className="text-sm text-muted-foreground">
                {hidden} more follow-ups are not shown. Filter by module or
                assignee to narrow the list.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
