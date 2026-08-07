import { cn } from "@dashboard/ui/lib/utils";
import { Link, useParams } from "@tanstack/react-router";

const TABS = [
  { label: "Blasts", to: "/$team/marketing/blasts" },
  { label: "Groups", to: "/$team/marketing/groups" },
] as const;

export function MarketingSubNav({ active }: { active: "blasts" | "groups" }) {
  const { team } = useParams({ strict: false }) as { team: string };

  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => {
        const isActive = tab.label.toLowerCase() === active;

        return (
          <Link
            key={tab.label}
            to={tab.to}
            params={{ team }}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-gray-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
