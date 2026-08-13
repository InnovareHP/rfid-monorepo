import { TabsList, TabsTrigger } from "@dashboard/ui/components/tabs";
import { cn } from "@dashboard/ui/lib/utils";
import type { ComponentProps } from "react";

// The app's one segmented control: a table-header pill with a brand-accent
// active tab. Used by the integrations tabs and the calendar view switcher.
export function SegmentedTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        "h-auto w-fit gap-1 rounded-xl bg-table-header p-2.5",
        className
      )}
      {...props}
    />
  );
}

export function SegmentedTabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        "rounded-md px-4 py-1.5 text-sm font-bold text-muted-foreground data-[state=active]:bg-brand-accent data-[state=active]:text-brand-accent-foreground data-[state=active]:shadow-xs",
        className
      )}
      {...props}
    />
  );
}
