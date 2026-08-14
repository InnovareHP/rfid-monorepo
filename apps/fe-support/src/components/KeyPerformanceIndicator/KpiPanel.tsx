import { cn } from "@dashboard/ui/lib/utils";
import { type LucideIcon } from "lucide-react";

type KpiPanelProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
};

export function KpiPanel({
  title,
  description,
  icon: Icon,
  className,
  children,
}: KpiPanelProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card/80 p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
