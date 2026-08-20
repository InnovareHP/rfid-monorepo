import { cn } from "@dashboard/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

type BlastStepSectionProps = {
  step: number;
  title: string;
  children: ReactNode;
};

// Numbered, collapsible card used by the classic editor's two steps.
export const BlastStepSection = ({
  step,
  title,
  children,
}: BlastStepSectionProps) => {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-4 border-b border-border bg-table-header px-6 py-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {step}
        </span>
        <span className="flex-1 text-lg font-semibold text-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "size-5 text-muted-foreground transition-transform",
            !open && "-rotate-90"
          )}
        />
      </button>

      {open ? <div className="space-y-4 px-6 py-5">{children}</div> : null}
    </section>
  );
};
