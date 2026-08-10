import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { cn } from "@dashboard/ui/lib/utils";

type SlotPickerProps = {
  slots: string[];
  selected: string | null;
  timezone: string;
  onSelect: (slot: string) => void;
};

// Beside the calendar this is a fixed-width column taking its height from the
// row; stacked under it on a phone it becomes a short grid, since a single
// column of times wastes the width and buries the later slots.
export function SlotPicker({
  slots,
  selected,
  timezone,
  onSelect,
}: SlotPickerProps) {
  if (slots.length === 0) {
    return (
      <div className="w-[240px] shrink-0 border-l p-6 text-sm text-muted-foreground max-md:w-full max-md:border-l-0 max-md:border-t max-md:p-4">
        No available times on this date.
      </div>
    );
  }

  return (
    <ScrollArea className="w-[240px] shrink-0 border-l h-[480px] max-md:w-full max-md:border-l-0 max-md:border-t">
      <div className="grid grid-cols-3 gap-2 p-4 md:flex md:flex-col md:p-6">
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
