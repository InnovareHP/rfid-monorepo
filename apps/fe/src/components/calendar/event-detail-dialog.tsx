import {
  deleteCalendarEvent,
  type CalendarEvent,
} from "@/services/calendar/calendar-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
}: EventDetailDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!event) throw new Error("No event");
      return deleteCalendarEvent(event.provider, event.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event deleted");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete event");
    },
  });

  if (!event) return null;

  const startDate = event.start ? new Date(event.start) : null;
  const endDate = event.end ? new Date(event.end) : null;

  const formatTime = (date: Date | null) => {
    if (!date) return "N/A";
    return event.allDay
      ? format(date, "MMM d, yyyy")
      : format(date, "MMM d, yyyy h:mm a");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event.title}
            <Badge
              className={
                event.provider === "google"
                  ? "text-xs bg-[#ea4335] text-white hover:bg-[#d33426]"
                  : "text-xs bg-[#0078d4] text-white hover:bg-[#006cbe]"
              }
            >
              {event.provider === "google" ? "Google" : "Outlook"}
            </Badge>
          </DialogTitle>
          {event.description && (
            <DialogDescription>{event.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Clock className="size-4 mt-0.5 text-muted-foreground" />
            <div>
              <p>{formatTime(startDate)}</p>
              {endDate && <p className="text-muted-foreground">to {formatTime(endDate)}</p>}
              {event.allDay && (
                <Badge variant="outline" className="text-xs mt-1">
                  All day
                </Badge>
              )}
            </div>
          </div>

          {event.location && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="size-4 mt-0.5 text-muted-foreground" />
              <p>{event.location}</p>
            </div>
          )}

          {event.organizer && (
            <div className="flex items-start gap-2 text-sm">
              <Users className="size-4 mt-0.5 text-muted-foreground" />
              <p>Organizer: {event.organizer}</p>
            </div>
          )}

          {event.attendees.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Users className="size-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium mb-1">
                  Attendees ({event.attendees.length})
                </p>
                {event.attendees.slice(0, 5).map((a) => (
                  <p key={a.email} className="text-muted-foreground">
                    {a.email}{" "}
                    {a.responseStatus && (
                      <span className="text-xs">({a.responseStatus})</span>
                    )}
                  </p>
                ))}
                {event.attendees.length > 5 && (
                  <p className="text-muted-foreground text-xs">
                    +{event.attendees.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            {event.htmlLink && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4 mr-1" />
                  Open in {event.provider === "google" ? "Google" : "Outlook"}
                </a>
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="size-4 mr-1" />
              )}
              Delete
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
