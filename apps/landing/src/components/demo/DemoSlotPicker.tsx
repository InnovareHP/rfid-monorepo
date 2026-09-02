import { Calendar } from "@dashboard/ui/components/calendar";
import { CalendarClock, Check, Clock, Globe } from "lucide-react";
import { useState } from "react";
import { fromDateKey, todayKey, toDateKey } from "./demo-dates";

// No timeZone option: the visitor's own zone is the one they think in.
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const dayLabel = (key: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(fromDateKey(key));

const visitorZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function DemoSlotPicker({
  date,
  month,
  availableDays,
  slots,
  hostName,
  durationMinutes,
  isLoadingDays,
  isLoadingSlots,
  isBooking,
  error,
  onDateChange,
  onMonthChange,
  onPick,
}: {
  date: string;
  month: string;
  availableDays: string[];
  slots: string[];
  hostName?: string;
  durationMinutes?: number;
  isLoadingDays: boolean;
  isLoadingSlots: boolean;
  isBooking: boolean;
  error: string | null;
  onDateChange: (date: string) => void;
  onMonthChange: (month: string) => void;
  onPick: (startTime: string) => void;
}) {
  // Two taps to book: a mistimed tap on a phone should not put a call on
  // someone's calendar.
  const [selected, setSelected] = useState<string | null>(null);

  const open = new Set(availableDays);
  const selectedDate = fromDateKey(date);
  // The displayed month is the parent's, not the selection's: a month with
  // nothing free would otherwise snap the calendar back and trap the arrows.
  const shownMonth = fromDateKey(`${month}-01`);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-accent">
          <CalendarClock className="size-3.5" />
          Pick a time
        </p>
        <h2 className="text-lg font-semibold">
          {durationMinutes ?? 30} minute call
          {hostName ? ` with ${hostName}` : ""}
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Globe className="size-3.5 shrink-0" />
          Times shown in {visitorZone()}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="rounded-xl border border-border bg-background">
          <Calendar
            mode="single"
            required
            selected={selectedDate}
            month={shownMonth}
            onMonthChange={(next) => onMonthChange(toDateKey(next).slice(0, 7))}
            onSelect={(next) => {
              if (!next) return;
              setSelected(null);
              onDateChange(toDateKey(next));
            }}
            // A day with nothing free is not selectable, and neither is the past.
            disabled={[
              { before: fromDateKey(todayKey()) },
              (day: Date) => !open.has(toDateKey(day)),
            ]}
            className="w-full"
          />
        </div>

        <div className="min-w-0 space-y-3">
          <p className="text-sm font-medium">{dayLabel(date)}</p>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {isLoadingDays || isLoadingSlots ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : slots.length ? (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {slots.map((slot) => {
                const isSelected = selected === slot;

                return (
                  <div key={slot} className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelected(isSelected ? null : slot)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-border bg-card hover:border-brand-accent hover:text-brand-accent"
                      }`}
                    >
                      <Clock className="size-3.5 shrink-0" />
                      {timeLabel(slot)}
                    </button>

                    {isSelected && (
                      <button
                        type="button"
                        disabled={isBooking}
                        onClick={() => onPick(slot)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-60"
                      >
                        <Check className="size-3.5" />
                        {isBooking ? "Booking..." : "Confirm"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {availableDays.length
                ? "Nothing free that day. Try one of the highlighted dates."
                : "No times left this month. Use the arrows to look ahead."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
