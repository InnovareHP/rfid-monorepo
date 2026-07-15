import {
  createMarketLog,
  deleteMarketLog,
  getFacilityOptions,
  getMarketLogs,
} from "@/services/market/market-service";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
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
import { Building2, Loader2, Megaphone, MessagesSquare } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";
import {
  LogEmptyState,
  LogPageHeader,
  LogRowDelete,
  LogStatCard,
  LogTableSkeleton,
} from "../log-shared/log-page-shell";
import { ReusableTable } from "../reusable-table/generic-table";

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

const TOUCHPOINT_LABELS: Record<string, string> = {
  IN_PERSON_MEETING: "In Person",
  LINKED_IN: "LinkedIn",
  FACEBOOK: "Facebook",
  TEXT: "Text",
  EMAIL: "Email",
  PHONE: "Phone",
  OTHER: "Other",
};

const MarketLogPage = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const options = Object.entries(TOUCHPOINT_LABELS).map(([value, label]) => ({
    label,
    value,
  }));

  const [filterMeta, setFilterMeta] = useState({
    page: 1,
    limit: 20,
  });

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

  const deleteMarketMutation = useMutation({
    mutationFn: async (id: string) => await deleteMarketLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market-logs"] });
      toast.success("Marketing log deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const rows: any[] = Array.isArray(marketLogsQuery.data?.data)
    ? marketLogsQuery.data.data
    : [];
  const totalEntries = marketLogsQuery.data?.total ?? 0;

  const uniqueFacilities = new Set(rows.map((r) => r.facility)).size;
  const touchpointCounts = new Map<string, number>();
  for (const row of rows) {
    for (const tp of row.touchpoints ?? []) {
      touchpointCounts.set(tp, (touchpointCounts.get(tp) ?? 0) + 1);
    }
  }
  const topTouchpoint =
    [...touchpointCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const isLoading = marketLogsQuery.isLoading || facilityOptionsQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <LogPageHeader
          icon={Megaphone}
          title="Marketing Log"
          subtitle="Track facility visits, touchpoints, and outreach activity"
          actionLabel="Log Activity"
          onAction={() => setOpen(true)}
        />

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

        <Card className="overflow-hidden border border-gray-200">
          <div className="overflow-x-auto p-4">
            {isLoading ? (
              <LogTableSkeleton />
            ) : rows.length > 0 ? (
              <ReusableTable
                data={rows}
                columns={[
                  {
                    key: "facility",
                    header: "Facility",
                    render: (row: any) => (
                      <span className="font-medium text-gray-900">
                        {row.facility}
                      </span>
                    ),
                  },
                  {
                    key: "touchpoint",
                    header: "Touchpoints",
                    render: (row: any) => (
                      <div className="flex flex-wrap gap-1">
                        {(row.touchpoints ?? []).map((tp: string) => (
                          <Badge
                            key={tp}
                            variant="secondary"
                            className="text-xs font-medium"
                          >
                            {TOUCHPOINT_LABELS[tp] ?? tp}
                          </Badge>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: "talkedTo",
                    header: "Talked To",
                    render: (row: any) => row.talkedTo,
                  },
                  {
                    key: "reasonForVisit",
                    header: "Reason for Visit",
                    render: (row: any) => (
                      <span
                        className="block max-w-56 truncate text-gray-600"
                        title={row.reasonForVisit ?? ""}
                      >
                        {row.reasonForVisit || "—"}
                      </span>
                    ),
                  },
                  {
                    key: "createdAt",
                    header: "Logged",
                    render: (row: any) => (
                      <span className="text-gray-500 whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </span>
                    ),
                  },
                  {
                    key: "notes",
                    header: "Notes",
                    render: (row: any) => (
                      <span
                        className="block max-w-48 truncate text-gray-600"
                        title={row.notes ?? ""}
                      >
                        {row.notes || "—"}
                      </span>
                    ),
                  },
                  {
                    key: "action",
                    header: "",
                    render: (row: any) => (
                      <LogRowDelete
                        entityLabel="marketing activity"
                        disabled={deleteMarketMutation.isPending}
                        onDelete={() => deleteMarketMutation.mutate(row.id)}
                      />
                    ),
                  },
                ]}
                currentPage={filterMeta.page}
                itemsPerPage={filterMeta.limit}
                onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
                totalCount={totalEntries}
                emptyMessage="No marketing logs found"
                isLoading={marketLogsQuery.isLoading}
              />
            ) : (
              <LogEmptyState
                icon={Megaphone}
                title="No marketing activity yet"
                description="Log your first facility visit or outreach touchpoint to start building your activity history."
                actionLabel="Log Activity"
                onAction={() => setOpen(true)}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MarketLogPage;
