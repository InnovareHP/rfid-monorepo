import type { GroupMembersPage } from "@/services/marketing/group-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { AlertCircle } from "lucide-react";

// Records without an email stay visible and marked, so a group that looks full
// but mails almost nobody is obvious before the blast goes out.
export function GroupMembersTable({ page }: { page?: GroupMembersPage }) {
  if (!page) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const unreachable = page.total - page.reachable;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-info/30 bg-table-header px-4 py-3">
        <span className="text-2xl font-bold text-foreground">
          {page.reachable.toLocaleString()}
        </span>
        <span className="text-sm text-foreground">
          will be emailed of {page.total.toLocaleString()} matched
        </span>
        {unreachable > 0 && (
          <span className="flex items-center gap-1 text-sm text-warning">
            <AlertCircle className="size-3.5" />
            {unreachable.toLocaleString()} without an email
          </span>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-table-header text-left text-xs font-semibold text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2">Record</th>
              <th className="px-4 py-2">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {page.members.map((member) => (
              <tr key={member.recordId}>
                <td className="truncate px-4 py-2 text-foreground">
                  {member.recordName}
                </td>
                <td className="truncate px-4 py-2">
                  {member.email ?? (
                    <span className="text-warning">No email</span>
                  )}
                </td>
              </tr>
            ))}
            {page.members.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No records match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {page.total > page.members.length && (
        <p className="text-xs text-muted-foreground">
          Showing the first {page.members.length.toLocaleString()} of{" "}
          {page.total.toLocaleString()}.
        </p>
      )}
    </div>
  );
}
