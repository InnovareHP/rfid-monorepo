import { PageHeader } from "@/components/page-header";
import { getSentEmails } from "@/services/email/email-service";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SentEmailRow } from "./sent-email-row";

const PAGE_LIMIT = 25;

export function SentEmailsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["sent-emails"],
      queryFn: ({ pageParam }) => getSentEmails(pageParam, PAGE_LIMIT),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) =>
        pages.length * PAGE_LIMIT < lastPage.total
          ? pages.length + 1
          : undefined,
      refetchInterval: 1000 * 30,
    });

  const emails = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader
          title="Sent Emails"
          description={`Every CRM email your team has sent, newest first. ${total} total.`}
        />

        {isLoading ? (
          <Spinner />
        ) : emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails sent yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-table-header">
                  <TableHead>Sent</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <SentEmailRow key={email.id} email={email} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

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
    </div>
  );
}
