import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { cn } from "@dashboard/ui/lib/utils";

type SlotPickerProps = {
  slots: string[];
  selected: string | null;
  timezone: string;
  onSelect: (slot: string) => void;
};

// Height comes from the row beside the calendar, so a day with many openings
// scrolls inside the card instead of stretching it.
export function SlotPicker({
  slots,
  selected,
  timezone,
  onSelect,
}: SlotPickerProps) {
  if (slots.length === 0) {
    return (
      <div className="w-[240px] shrink-0 border-l p-6 text-sm text-muted-foreground max-md:w-full">
        No available times on this date.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-[240px] shrink-0 border-l max-md:h-[280px] max-md:w-full">
      <div className="flex flex-col gap-2 p-6">
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
    </ScrollArea>
  );
}
