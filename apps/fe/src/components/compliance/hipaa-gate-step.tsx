import type { ReactNode } from "react";
import { Check } from "lucide-react";

// One numbered requirement in the HIPAA gate. A finished step keeps its place
// in the list rather than disappearing, so the user can see what is left.
export function StepRow({
  index,
  title,
  description,
  done,
  children,
}: {
  index: number;
  title: string;
  description: string;
  done: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={
          done
            ? "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-semibold text-success"
            : "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        }
      >
        {done ? <Check className="h-3.5 w-3.5" /> : index}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <p
          className={
            done
              ? "text-sm font-medium text-muted-foreground line-through"
              : "text-sm font-medium text-foreground"
          }
        >
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {done ? null : children}
      </div>
    </div>
  );
}
