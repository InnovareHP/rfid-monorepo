import { useState } from "react";
import {
  bookDemo,
  createDemoRequest,
  fetchSlots,
  readAttribution,
  type BookedDemo,
  type DemoRequestPayload,
  type DemoRequestResult,
} from "./demo-api";
import { DemoRequestForm } from "./DemoRequestForm";
import { DemoSlotPicker } from "./DemoSlotPicker";

const today = () => new Date().toISOString().slice(0, 10);

// Two steps on one page: the request is saved before a time is picked, so a
// prospect who never reaches the calendar is still a lead we can follow up.
export function DemoScheduler() {
  const [request, setRequest] = useState<DemoRequestResult | null>(null);
  const [booked, setBooked] = useState<BookedDemo | null>(null);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[]>([]);
  const [pending, setPending] = useState<"submit" | "slots" | "book" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const loadSlots = async (requestId: string, nextDate: string) => {
    setPending("slots");
    setError(null);
    try {
      setSlots(await fetchSlots(requestId, nextDate));
    } catch (cause) {
      setSlots([]);
      setError(cause instanceof Error ? cause.message : "Could not load times.");
    } finally {
      setPending(null);
    }
  };

  const submit = async (payload: DemoRequestPayload) => {
    setPending("submit");
    setError(null);
    try {
      const result = await createDemoRequest({
        ...payload,
        ...readAttribution(),
      });
      setRequest(result);

      if (result.id && result.acceptingBookings) {
        await loadSlots(result.id, date);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send that.");
    } finally {
      setPending((current) => (current === "submit" ? null : current));
    }
  };

  const pick = async (startTime: string) => {
    if (!request?.id) return;

    setPending("book");
    setError(null);
    try {
      setBooked(await bookDemo(request.id, startTime));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not book that time."
      );
      // The slot list is stale the moment a booking fails on a conflict.
      await loadSlots(request.id, date);
    } finally {
      setPending((current) => (current === "book" ? null : current));
    }
  };

  if (booked) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">You are booked</h2>
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeStyle: "short",
            timeZoneName: "short",
          }).format(new Date(booked.startTime))}
          . A calendar invite is on its way to your inbox, with a link to
          reschedule if you need it.
        </p>
        {booked.meetingUrl && (
          <a
            href={booked.meetingUrl}
            className="inline-block text-sm font-medium text-brand-accent underline"
          >
            Join link
          </a>
        )}
      </div>
    );
  }

  // A request with no host, or a host with no connected calendar, still saved
  // the lead — say so rather than showing an empty calendar.
  if (request && !request.acceptingBookings) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Thanks, we have your request</h2>
        <p className="text-sm text-muted-foreground">
          Online scheduling is unavailable right now, so we will email you to
          arrange a time.
        </p>
      </div>
    );
  }

  if (request?.id) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <DemoSlotPicker
          date={date}
          slots={slots}
          hostName={request.hostName}
          durationMinutes={request.durationMinutes}
          isLoading={pending === "slots"}
          isBooking={pending === "book"}
          error={error}
          onDateChange={(next) => {
            setDate(next);
            void loadSlots(request.id!, next);
          }}
          onPick={(startTime) => void pick(startTime)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <DemoRequestForm
        isSubmitting={pending === "submit"}
        error={error}
        onSubmit={(payload) => void submit(payload)}
      />
    </div>
  );
}
