import type { DenialReasonRow } from "@/lib/helper/analytics-chart-data";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";

const TOP_LIMIT = 5;

type DenialReasonsTableProps = {
  reasons: DenialReasonRow[];
  emptyMessage?: string;
};

export function DenialReasonsTable({
  reasons,
  emptyMessage = "No denial data available",
}: DenialReasonsTableProps) {
  const [categoryOrder, setCategoryOrder] = useState<"asc" | "desc" | null>(
    null
  );

  if (reasons.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const rows = reasons.slice(0, TOP_LIMIT);
  const sorted = categoryOrder
    ? [...rows].sort((a, b) =>
        categoryOrder === "asc"
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category)
      )
    : rows;

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-brand/5 hover:bg-brand/5">
            <TableHead className="h-12 text-foreground">Reasons</TableHead>
            <TableHead className="h-12 text-right text-foreground">
              <button
                type="button"
                onClick={() =>
                  setCategoryOrder((order) =>
                    order === "asc" ? "desc" : "asc"
                  )
                }
                className="ml-auto flex items-center gap-1 font-medium"
              >
                Category
                <ChevronsUpDown className="size-3.5" aria-hidden="true" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((reason) => (
            <TableRow key={reason.name}>
              <TableCell
                className="max-w-0 truncate py-4"
                title={reason.name}
              >
                {reason.name}
              </TableCell>
              <TableCell className="py-4 text-right">
                <Badge
                  variant="outline"
                  className="rounded-full font-normal text-muted-foreground"
                >
                  {reason.category}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
