import { cn } from "@dashboard/ui/lib/utils";

type SlotPickerProps = {
  slots: string[];
  selected: string | null;
  timezone: string;
  onSelect: (slot: string) => void;
};

// A single scrolling column beside the calendar, per the booking page design.
export function SlotPicker({
  slots,
  selected,
  timezone,
  onSelect,
}: SlotPickerProps) {
  if (slots.length === 0) {
    return (
      <p className="w-full shrink-0 border-l p-6 text-sm text-muted-foreground">
        No available times on this date.
      </p>
    );
  }

  return (
    <div className="flex w-[240px] shrink-0 flex-col gap-2 overflow-y-auto border-l p-6">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onSelect(slot)}
          className={cn(
            "h-9 shrink-0 rounded-md border text-sm font-semibold transition-colors",
            selected === slot
              ? "border-[#0d3185] bg-[#0d3185] text-white"
              : "bg-background text-[#202020] hover:border-[#0d3185]"
          )}
        >
          {new Date(slot).toLocaleTimeString("en-GB", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
          })}
        </button>
      ))}
    </div>
  );
}
