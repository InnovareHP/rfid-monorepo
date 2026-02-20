import { exportToCsv } from "@/lib/export-csv";
import { getTicketRatings } from "@/services/support/support-service";
import type { TicketRatingRow } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Button } from "@dashboard/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, ExternalLink, MessageSquare, Star } from "lucide-react";
import { useState } from "react";
import { ReusableTable } from "../ReusableTable/ReusableTable";

const TAKE = 20;

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
      <span className="ml-1.5 text-xs font-medium text-muted-foreground">
        {rating}/5
      </span>
    </div>
  );
}

export function CsatReportPage() {
  const [page, setPage] = useState(1);

  const { data: { ratings = [], total = 0 } = {}, isLoading } = useQuery({
    queryKey: ["csat-ratings", page],
    queryFn: () => getTicketRatings(page, TAKE),
  });

  const avgRating =
    ratings.length > 0
      ? (
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        ).toFixed(1)
      : null;

  const columns = [
    {
      key: "ticket",
      header: "Ticket",
      render: (row: TicketRatingRow) => (
        <Link
          to={"/support/tickets/$ticketNumber" as any}
          params={{ ticketNumber: row.supportTicket.ticketNumber } as any}
          className="group flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
        >
          #{row.supportTicket.ticketNumber}
          <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </Link>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (row: TicketRatingRow) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.supportTicket.subject}
        </span>
      ),
    },
    {
      key: "requester",
      header: "Requester",
      render: (row: TicketRatingRow) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.createdByUser.user_image} />
            <AvatarFallback className="text-xs">
              {row.createdByUser.user_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm truncate max-w-[120px]">
            {row.createdByUser.user_name}
          </span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (row: TicketRatingRow) => <StarDisplay rating={row.rating} />,
    },
    {
      key: "comment",
      header: "Comment",
      render: (row: TicketRatingRow) =>
        row.comment ? (
          <div className="flex items-start gap-1.5 max-w-xs">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground line-clamp-2 italic">
              "{row.comment}"
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        ),
    },
    {
      key: "date",
      header: "Date",
      render: (row: TicketRatingRow) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full flex flex-col">
      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              CSAT Report
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer satisfaction ratings across all resolved tickets
            </p>
          </div>

          {/* Summary pill + export */}
          <div className="flex items-center gap-3 shrink-0">
          {!isLoading && total > 0 && (
            <Card className="shrink-0 border border-border shadow-sm">
              <CardContent className="flex items-center gap-3 px-5 py-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round(Number(avgRating ?? 0))
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-none">
                    {avgRating}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / 5
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {total} rating{total !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={ratings.length === 0}
            onClick={() =>
              exportToCsv("csat-ratings", ratings, [
                {
                  header: "Ticket #",
                  value: (r) => r.supportTicket.ticketNumber,
                },
                {
                  header: "Subject",
                  value: (r) => r.supportTicket.subject,
                },
                { header: "Requester", value: (r) => r.createdByUser.user_name },
                { header: "Rating", value: (r) => r.rating },
                { header: "Comment", value: (r) => r.comment ?? "" },
                {
                  header: "Date",
                  value: (r) =>
                    new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                },
              ])
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          </div>
        </div>

        {/* Distribution bar */}
        {!isLoading && ratings.length > 0 && (
          <RatingDistribution ratings={ratings} />
        )}

        {/* Table */}
        <ReusableTable
          data={ratings}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No ratings yet"
          totalCount={total}
          currentPage={page}
          itemsPerPage={TAKE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function RatingDistribution({ ratings }: { ratings: TicketRatingRow[] }) {
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => r.rating === star).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Rating distribution (this page)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-1.5">
        {counts.map(({ star, count }) => (
          <div key={star} className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 w-20 shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3 w-3 ${
                    s <= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-4 text-right">
              {count}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
