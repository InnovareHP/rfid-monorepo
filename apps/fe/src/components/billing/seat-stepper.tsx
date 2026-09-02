import { Button } from "@dashboard/ui/components/button";
import { Minus, Plus } from "lucide-react";

// Bounds are the member count below and the purchasable ceiling above, so the
// stepper can never offer a seat count the API would refuse.
export function SeatStepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (seats: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Remove a seat"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="h-4 w-4" />
      </Button>

      <span className="min-w-10 text-center text-lg font-semibold tabular-nums">
        {value}
      </span>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Add a seat"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
