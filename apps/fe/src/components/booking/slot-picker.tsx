import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";

type SlotPickerProps = {
  slots: string[];
  selected: string | null;
  onSelect: (slot: string) => void;
};

export function SlotPicker({ slots, selected, onSelect }: SlotPickerProps) {
  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No available times on this date.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((slot) => (
        <Button
          key={slot}
          type="button"
          variant={selected === slot ? "default" : "outline"}
          className={cn("w-full")}
          onClick={() => onSelect(slot)}
        >
          {new Date(slot).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Button>
      ))}
    </div>
  );
}
