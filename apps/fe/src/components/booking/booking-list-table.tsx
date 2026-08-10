import { Skeleton } from "@dashboard/ui/components/skeleton";
import {
  cancelBooking,
  getOwnBookings,
  type Booking,
} from "@/services/booking/booking-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { cn } from "@dashboard/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BOOKING_SKELETON_ROWS = Array.from(
  { length: 5 },
  (_, index) => `booking-skeleton-${index}`
);

const TABS = [
  { key: "all", label: "All Bookings" },
  { key: "upcoming", label: "Upcoming Bookings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_STYLES = {
  Completed: "bg-emerald-50 text-emerald-700 before:bg-emerald-600",
  Canceled: "bg-red-50 text-red-700 before:bg-red-600",
  Upcoming: "bg-blue-50 text-[#005cb1] before:bg-[#005cb1]",
} as const;

// Derived rather than stored: the row only knows CONFIRMED or CANCELLED, and
// whether a confirmed meeting has already happened is a question of the clock.
const statusOf = (booking: Booking): keyof typeof STATUS_STYLES => {
  if (booking.status === "CANCELLED") return "Canceled";
  return new Date(booking.endTime) < new Date() ? "Completed" : "Upcoming";
};

const durationLabel = (booking: Booking) => {
  const minutes = Math.round(
    (new Date(booking.endTime).getTime() -
      new Date(booking.startTime).getTime()) /
      60000
  );
  return `${minutes} minutes`;
};

export function BookingListTable() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const bookingsQuery = useQuery({
    queryKey: ["bookings", page, limit],
    queryFn: () => getOwnBookings(page, limit),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      toast.success("Booking canceled");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: () => toast.error("Failed to cancel this booking"),
  });

  const rows = bookingsQuery.data?.data ?? [];
  // The API paginates but does not filter, so the tab narrows the page in hand.
  const visible =
    tab === "upcoming"
      ? rows.filter((booking) => statusOf(booking) === "Upcoming")
      : rows;

  const total = bookingsQuery.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-[10px] bg-muted p-2.5">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={cn(
              "h-8 rounded-md px-3 text-sm transition-colors",
              tab === entry.key
                ? "bg-[#005cb1] font-bold text-white"
                : "font-semibold text-[#7584a8]"
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date &amp; Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookingsQuery.isLoading ? (
              BOOKING_SKELETON_ROWS.map((key) => (
                <TableRow key={key}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No bookings yet.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((booking) => {
                const status = statusOf(booking);
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.inviteeName}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.startTime).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell>{durationLabel(booking)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
                          "before:h-2 before:w-2 before:rounded-full before:content-['']",
                          STATUS_STYLES[status]
                        )}
                      >
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {booking.meetingUrl && status === "Upcoming" && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={booking.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Video className="h-4 w-4" />
                              Join
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            status !== "Upcoming" || cancelMutation.isPending
                          }
                          onClick={() => cancelMutation.mutate(booking.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page</span>
          <Select
            value={String(limit)}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-sm">
          Page {page} of {lastPage}
        </span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => setPage(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= lastPage}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= lastPage}
            onClick={() => setPage(lastPage)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
