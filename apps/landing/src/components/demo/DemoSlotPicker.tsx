const FIELD =
  "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-accent";

// No timeZone option: the visitor's own zone is the one they think in.
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const visitorZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function DemoSlotPicker({
  date,
  slots,
  hostName,
  durationMinutes,
  isLoading,
  isBooking,
  error,
  onDateChange,
  onPick,
}: {
  date: string;
  slots: string[];
  hostName?: string;
  durationMinutes?: number;
  isLoading: boolean;
  isBooking: boolean;
  error: string | null;
  onDateChange: (date: string) => void;
  onPick: (startTime: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pick a time</h2>
        <p className="text-sm text-muted-foreground">
          {durationMinutes ?? 30} minutes
          {hostName ? ` with ${hostName}` : ""}, shown in your local time (
          {visitorZone()}).
        </p>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Date</span>
        <input
          type="date"
          className={FIELD}
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading times...</p>
      ) : slots.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={isBooking}
              onClick={() => onPick(slot)}
              className="rounded-md border border-border bg-card px-2 py-2 text-sm font-medium hover:border-brand-accent disabled:opacity-60"
            >
              {timeLabel(slot)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nothing free that day. Try another date.
        </p>
      )}
    </div>
  );
}
