import {
  createCalendarEvent,
  type CalendarConnectionStatus,
  type CalendarProvider,
} from "@/services/calendar/calendar-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Switch } from "@dashboard/ui/components/switch";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionStatus: CalendarConnectionStatus;
  defaultDate?: Date;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  connectionStatus,
  defaultDate,
}: CreateEventDialogProps) {
  const queryClient = useQueryClient();

  const connectedProviders: CalendarProvider[] = [];
  if (connectionStatus.google.connected) connectedProviders.push("google");
  if (connectionStatus.outlook.connected) connectedProviders.push("outlook");

  const [provider, setProvider] = useState<CalendarProvider>(
    connectedProviders[0] || "google"
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = defaultDate || new Date();
    return d.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = defaultDate || new Date();
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [location, setLocation] = useState("");

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event created");
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to create event");
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setAllDay(false);
    setLocation("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    createMutation.mutate({
      provider,
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: new Date(startDate).toISOString(),
      endTime: new Date(endDate).toISOString(),
      allDay,
      location: location.trim() || undefined,
    });
  }

  if (connectedProviders.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Connect a calendar account first to create events.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Add a new event to your calendar
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {connectedProviders.length > 1 && (
              <div className="grid gap-2">
                <Label htmlFor="provider">Calendar</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => setProvider(v as CalendarProvider)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {connectionStatus.google.connected && (
                      <SelectItem value="google">
                        Google ({connectionStatus.google.email})
                      </SelectItem>
                    )}
                    {connectionStatus.outlook.connected && (
                      <SelectItem value="outlook">
                        Outlook ({connectionStatus.outlook.email})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="allDay"
                checked={allDay}
                onCheckedChange={setAllDay}
              />
              <Label htmlFor="allDay">All day</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? startDate.slice(0, 10) : startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? endDate.slice(0, 10) : endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Optional location"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="size-4 animate-spin mr-1" />
              )}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
