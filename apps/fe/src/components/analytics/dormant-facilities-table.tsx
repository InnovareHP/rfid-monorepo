import { DEFAULT_RANK_LIMIT } from "@/lib/helper/analytics-chart-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";

type DormantFacility = {
  name: string;
  county: string | null;
};

type DormantFacilitiesTableProps = {
  facilities: DormantFacility[];
  emptyMessage?: string;
  limit?: number;
};

export function DormantFacilitiesTable({
  facilities,
  emptyMessage = "Every facility sent a referral in this period",
  limit = DEFAULT_RANK_LIMIT,
}: DormantFacilitiesTableProps) {
  if (facilities.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const rows = facilities.slice(0, limit);
  const hidden = facilities.length - rows.length;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-brand/5 hover:bg-brand/5">
            <TableHead className="h-12 text-foreground">Facility</TableHead>
            <TableHead className="h-12 text-right text-foreground">
              County
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((facility) => (
            <TableRow key={facility.name}>
              <TableCell className="max-w-0 truncate py-4" title={facility.name}>
                {facility.name}
              </TableCell>
              <TableCell className="py-4 text-right text-muted-foreground">
                {facility.county ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>

      {/* A capped table that says nothing reads as the whole list. */}
      {hidden > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} of {facilities.length}
        </p>
      )}
    </div>
  );
}
