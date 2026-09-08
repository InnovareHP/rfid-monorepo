import { cn } from "@dashboard/ui/lib/utils";
import { Check } from "lucide-react";
import { MODULE_STEPS } from "./module-setup-schema";

type ModuleStepRailProps = {
  step: number;
  onStepChange: (step: number) => void;
};

export const ModuleStepRail = ({ step, onStepChange }: ModuleStepRailProps) => (
  <ol className="flex items-center gap-1 sm:gap-3">
    {MODULE_STEPS.map((title, index) => {
      const done = index < step;
      const current = index === step;

      return (
        <li key={title} className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            // Only a step already cleared is safe to jump back to; forward
            // movement stays gated on Continue so validation still runs.
            disabled={!done}
            onClick={() => onStepChange(index)}
            className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                current && "bg-brand text-brand-foreground",
                done && "bg-brand/15 text-brand",
                !current && !done && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-sm sm:inline",
                current ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {title}
            </span>
          </button>

          {index < MODULE_STEPS.length - 1 && (
            <span
              className={cn(
                "h-px min-w-4 flex-1",
                done ? "bg-brand/30" : "bg-border"
              )}
            />
          )}
        </li>
      );
    })}
  </ol>
);
