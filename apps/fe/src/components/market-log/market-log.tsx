import { WriteGate } from "@/components/write-gate";
import ColumnFilter from "@/components/master-list/column-filter";
import { useLogDelete, useLogTable } from "@/hooks/use-log-table";
import {
  bulkDeleteMarketLogs,
  createMarketLog,
  getFacilityOptions,
  getMarketLogs,
} from "@/services/market/market-service";
import { LogDateFilter } from "@/components/log-shared/log-date-filter";
import { logDateFilter } from "@/lib/helper/log-date-filter";
import { PageHeader } from "@/components/page-header";
import type { DateRange } from "react-day-picker";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { MultiSelect } from "@dashboard/ui/components/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Loader2,
  Megaphone,
  MessagesSquare,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";
import { LogEmptyState, LogStatCard } from "../log-shared/log-page-shell";
import { LogTable } from "../log-shared/log-table";
import { marketLogColumns, TOUCHPOINT_LABELS } from "./market-log-columns";

export const CreateMarketSchema = z.object({
  facility: z.string().min(1, "Select a facility"),
  touchpoint: z
    .array(
      z.enum([
        "IN_PERSON_MEETING",
        "LINKED_IN",
        "FACEBOOK",
        "TEXT",
        "EMAIL",
        "PHONE",
        "OTHER",
      ])
    )
    .min(1, "Select at least one touchpoint"),
  talkedTo: z.string().min(1, "Enter who you talked to"),
  reasonForVisit: z.string().min(1, "Enter the reason for the visit"),
  notes: z.string().optional(),
});

export type CreateMarketFormValues = z.infer<typeof CreateMarketSchema>;

const MarketLogPage = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const options = Object.entries(TOUCHPOINT_LABELS).map(([value, label]) => ({
    label,
    value,
  }));

  const [filterMeta, setFilterMeta] = useState<{
    page: number;
    limit: number;
    filter?: Record<string, string>;
  }>({ page: 1, limit: 25 });

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setFilterMeta((prev) => ({
      ...prev,
      page: 1,
      filter: logDateFilter(range, "marketingDateFrom", "marketingDateTo"),
    }));
  };

  const [marketLogsQuery, facilityOptionsQuery] = useQueries({
    queries: [
      {
        queryKey: ["market-logs", filterMeta],
        queryFn: () => getMarketLogs(filterMeta),
      },
      {
        queryKey: ["facility-options"],
        queryFn: () => getFacilityOptions(),
      },
    ],
  });

  const createMarketMutation = useMutation({
    mutationFn: createMarketLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-logs"] });
      toast.success("Marketing log created successfully!");
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMarketMutation = useLogDelete(
    "market-logs",
    bulkDeleteMarketLogs
  );

  const { mutate: deleteRow, isPending: isDeleting } = deleteMarketMutation;

  const columns = useMemo(
    () =>
      marketLogColumns(
        (id) =>
          deleteRow([id], {
            onSuccess: () => toast.success("Marketing log deleted successfully!"),
            onError: (error) => toast.error(error.message),
          }),
        isDeleting
      ),
    [deleteRow, isDeleting]
  );

  const form = useForm<CreateMarketFormValues>({
    resolver: zodResolver(CreateMarketSchema),
    defaultValues: {
      facility: "",
      touchpoint: [],
      talkedTo: "",
      reasonForVisit: "",
      notes: "",
    },
  });

  const onSubmit = (values: CreateMarketFormValues) => {
    createMarketMutation.mutate(values);
  };

  const rows = marketLogsQuery.data?.data ?? [];
  const totalEntries = marketLogsQuery.data?.total ?? 0;

  const { table, hideableColumns, onColumnOrderChange } = useLogTable(
    "market-log",
    rows,
    columns
  );

  const uniqueFacilities = new Set(rows.map((r) => r.facility)).size;
  const touchpointCounts = new Map<string, number>();
  for (const row of rows) {
    for (const tp of row.touchpoints) {
      touchpointCounts.set(tp, (touchpointCounts.get(tp) ?? 0) + 1);
    }
  }
  const topTouchpoint =
    [...touchpointCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const isLoading = marketLogsQuery.isLoading || facilityOptionsQuery.isLoading;

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader
          title="Marketing Log"
          description="Track facility visits, touchpoints, and outreach activity"
        >
          <LogDateFilter value={dateRange} onChange={handleDateChange} />
          <ColumnFilter tableColumns={hideableColumns} />
          <WriteGate>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Log Activity
            </Button>
          </WriteGate>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <LogStatCard
            icon={Megaphone}
            label="Total Activities"
            value={String(totalEntries)}
          />
          <LogStatCard
            icon={Building2}
            label="Facilities Touched"
            value={String(uniqueFacilities)}
            hint="on this page"
          />
          <LogStatCard
            icon={MessagesSquare}
            label="Top Touchpoint"
            value={topTouchpoint ? TOUCHPOINT_LABELS[topTouchpoint] : "—"}
            hint="on this page"
          />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Marketing Activity</DialogTitle>
              <DialogDescription>
                Record a facility visit or outreach touchpoint.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilityOptionsQuery.data?.map((option: any) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="touchpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Touchpoint</FormLabel>
                      <FormControl>
                        <MultiSelect
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          options={options}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="talkedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Talked To</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Talked To" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasonForVisit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Visit</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter Reason for Visit"
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Notes (Optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMarketMutation.isPending}
                  >
                    {createMarketMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create Entry
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {!isLoading && rows.length === 0 ? (
          <Card className="overflow-hidden border border-border">
            <LogEmptyState
              icon={Megaphone}
              title="No marketing activity yet"
              description="Log your first facility visit or outreach touchpoint to start building your activity history."
              actionLabel="Log Activity"
              onAction={() => setOpen(true)}
            />
          </Card>
        ) : (
          <LogTable
            table={table}
            isLoading={isLoading}
            totalCount={totalEntries}
            meta={filterMeta}
            onMetaChange={(meta) =>
              setFilterMeta((prev) => ({ ...prev, ...meta }))
            }
            onDelete={deleteMarketMutation.mutateAsync}
            onColumnOrderChange={onColumnOrderChange}
            emptyMessage="No marketing logs found"
          />
        )}
      </div>
    </div>
  );
};

export default MarketLogPage;
