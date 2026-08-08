import type { NotificationCategoryValue } from "@dashboard/shared";
import { cn } from "@dashboard/ui/lib/utils";

const CATEGORIES: { key: NotificationCategoryValue; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tasks", label: "Tasks" },
  { key: "referrals", label: "Referrals" },
  { key: "marketing", label: "Marketing" },
  { key: "booking", label: "Booking" },
];

type NotificationCategoryTabsProps = {
  active: NotificationCategoryValue;
  onChange: (category: NotificationCategoryValue) => void;
  className?: string;
};

export const NotificationCategoryTabs = ({
  active,
  onChange,
  className,
}: NotificationCategoryTabsProps) => (
  <div className={cn("flex flex-wrap gap-2", className)}>
    {CATEGORIES.map((category) => (
      <button
        key={category.key}
        type="button"
        onClick={() => onChange(category.key)}
        className={cn(
          "h-8 rounded-md px-3 text-sm transition-colors",
          active === category.key
            ? "bg-brand font-bold text-primary-foreground"
            : "border border-border bg-background font-semibold text-foreground hover:bg-muted"
        )}
      >
        {category.label}
      </button>
    ))}
  </div>
);
