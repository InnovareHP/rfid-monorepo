import type { StatusSlice } from "@/lib/helper/analytics-chart-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useState } from "react";
import { ChartCard } from "./chart-card";
import { StatusDonut } from "./status-donut";

const ALL_STATUSES = "__all__";

type StatusBreakdownCardProps = {
  slices: StatusSlice[];
  title?: string;
  totalLabel?: string;
  activeSuffix?: string;
};

export function StatusBreakdownCard({
  slices,
  title = "Status Breakdown",
  totalLabel,
  activeSuffix,
}: StatusBreakdownCardProps) {
  const [choice, setChoice] = useState<string | undefined>(undefined);

  // Until the user picks, highlight the first status that actually has records.
  const value =
    choice ?? slices.find((slice) => slice.count > 0)?.status ?? ALL_STATUSES;
  const selectedStatus = value === ALL_STATUSES ? undefined : value;

  const selector =
    slices.length > 0 ? (
      <Select value={value} onValueChange={setChoice}>
        <SelectTrigger className="h-10 w-[160px] rounded-xl px-4 text-sm shadow-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl">
          <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
          {slices.map((slice) => (
            <SelectItem key={slice.status} value={slice.status}>
              <span className="flex items-center gap-2.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                {slice.status}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : undefined;

  return (
    <ChartCard title={title} action={selector}>
      <StatusDonut
        slices={slices}
        selectedStatus={selectedStatus}
        totalLabel={totalLabel}
        activeSuffix={activeSuffix}
      />
    </ChartCard>
  );
}
