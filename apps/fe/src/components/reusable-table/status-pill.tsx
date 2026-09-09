import { cn } from "@dashboard/ui/lib/utils";
import { Check, Pencil, type LucideIcon } from "lucide-react";

export type StatusTone = "success" | "muted" | "info" | "danger";

const TONE_STYLES: Record<StatusTone, string> = {
  success: "border-success bg-card text-success",
  muted: "border-border bg-muted text-muted-foreground",
  info: "border-primary bg-card text-primary",
  danger: "border-destructive bg-card text-destructive",
};

type StatusPillProps = {
  label: string;
  tone: StatusTone;
  icon?: LucideIcon;
};

// Outline status pill shared by the marketing tables and the blast editor.
export function StatusPill({ label, tone, icon }: StatusPillProps) {
  const Icon = icon ?? (tone === "success" ? Check : Pencil);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        TONE_STYLES[tone]
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
