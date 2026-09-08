import { cn } from "@dashboard/ui/lib/utils";

export function FollowUpDetailRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone?: "overdue" | "due";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium text-foreground",
          tone === "overdue" && "text-destructive",
          tone === "due" && "text-primary"
        )}
      >
        {value ?? "Not yet"}
      </span>
    </div>
  );
}
