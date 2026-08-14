import { cn } from "@dashboard/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Three severities on one axis, so they share a shape and differ only by tone
// and whether the dot pulses. Overdue is the only one that is already breached.
const slaBadgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
  {
    variants: {
      tone: {
        overdue: "border-destructive/30 bg-destructive/10 text-destructive",
        awaiting: "border-warning/30 bg-warning/10 text-warning",
        atRisk: "border-warning/40 text-warning",
      },
    },
    defaultVariants: { tone: "awaiting" },
  }
);

const DOT_TONES = {
  overdue: "bg-destructive",
  awaiting: "bg-warning",
  atRisk: "bg-warning",
} as const;

export function SlaBadge({
  tone = "awaiting",
  pulse,
  children,
}: VariantProps<typeof slaBadgeVariants> & {
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={slaBadgeVariants({ tone })}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          DOT_TONES[tone ?? "awaiting"],
          pulse && "animate-pulse"
        )}
      />
      {children}
    </span>
  );
}
