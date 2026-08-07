import type { LucideIcon } from "lucide-react";

type DashboardChoiceProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
};

export function DashboardChoice({
  icon: Icon,
  title,
  description,
  onClick,
}: DashboardChoiceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/10 transition-all text-left group"
    >
      <div className="p-2.5 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}
