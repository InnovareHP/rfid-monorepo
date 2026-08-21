import { cn } from "@dashboard/ui/lib/utils";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  // Right-aligned actions: a button, a dialog trigger, a filter row.
  children?: ReactNode;
  className?: string;
};

// The one page title in the app. Every route header was hand-rolling these
// classes, which is why they had drifted across three sizes and two weights.
export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="page-title text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {children && (
        // Two columns on a phone so three or five actions land in tidy rows
        // instead of a ragged wrap; a lone last action takes the full width.
        <div className="grid grid-cols-2 gap-2 [&>*:nth-last-child(1):nth-child(odd)]:col-span-2 [&_button]:w-full sm:flex sm:flex-wrap sm:items-center sm:[&_button]:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
