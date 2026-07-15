import { formatCurrency } from "@/lib/helper/helper";
import {
  createMileageLog,
  deleteMileageLog,
  getMileageLogs,
} from "@/services/mileage/mileage-service";
import type { MileageLogRow } from "@dashboard/shared";
import { formatCapitalize } from "@dashboard/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Gauge, Loader2, Route } from "lucide-react";
import { useEffect, useState } from "react";
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

const FEDERAL_RATE = 0.67;
const STATE_RATE = 0.5;

export const MileageRateType = ["FEDERAL", "STATE"] as const;

export const CreateMillageSchema = z.object({
  destination: z.string().min(1, "Enter a destination"),
  countiesMarketed: z.string().min(1, "Enter counties marketed"),
  beginningMileage: z.number().min(0),
  endingMileage: z.number().min(0),
  totalMiles: z.number().min(0),
  rateType: z.enum(MileageRateType, {
    errorMap: () => ({ message: "Select a rate type" }),
  }),
  ratePerMile: z.number().min(0),
  reimbursementAmount: z.number().min(0),
});

export type CreateMileageFormValues = z.infer<typeof CreateMillageSchema>;

const MileageLogPage = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const [filterMeta, setFilterMeta] = useState({
    page: 1,
    limit: 20,
  });

  const { data: mileageLogsData, isLoading } = useQuery({
    queryKey: ["mileage-logs", filterMeta],
    queryFn: () => getMileageLogs(filterMeta),
  });

  const createMileageMutation = useMutation({
    mutationFn: createMileageLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mileage-logs"] });
      toast.success("Mileage log created successfully!");
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMileageMutation = useMutation({
    mutationFn: deleteMileageLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mileage-logs"] });
      toast.success("Mileage log deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<CreateMileageFormValues>({
    resolver: zodResolver(CreateMillageSchema),
    defaultValues: {
      destination: "",
      countiesMarketed: "",
      beginningMileage: 0,
      endingMileage: 0,
      totalMiles: 0,
      rateType: undefined,
      ratePerMile: 0,
      reimbursementAmount: 0,
    },
  });

  const beginningMileage = form.watch("beginningMileage");
  const endingMileage = form.watch("endingMileage");
  const rateType = form.watch("rateType");

  useEffect(() => {
    const totalMiles =
      endingMileage >= beginningMileage ? endingMileage - beginningMileage : 0;
    const ratePerMile =
      rateType === "FEDERAL"
        ? FEDERAL_RATE
        : rateType === "STATE"
          ? STATE_RATE
          : 0;

    form.setValue("totalMiles", totalMiles);
    form.setValue("ratePerMile", ratePerMile);
    form.setValue(
      "reimbursementAmount",
      Number((totalMiles * ratePerMile).toFixed(2))
    );
  }, [beginningMileage, endingMileage, rateType, form]);

  const onSubmit = (values: CreateMileageFormValues) => {
    createMileageMutation.mutate(values);
  };

  const rows: MileageLogRow[] = Array.isArray(mileageLogsData?.data)
    ? mileageLogsData.data
    : [];
  const totalEntries = mileageLogsData?.total ?? 0;

  const pageMiles = rows.reduce((sum, row) => sum + (row.totalMiles ?? 0), 0);
  const pageReimbursement = rows.reduce(
    (sum, row) => sum + (row.reimbursementAmount ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <LogPageHeader
          icon={Route}
          title="Mileage Log"
          subtitle="Track trips, miles driven, and reimbursements"
          actionLabel="Log Trip"
          onAction={() => setOpen(true)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <LogStatCard
            icon={Route}
            label="Total Trips"
            value={String(totalEntries)}
          />
          <LogStatCard
            icon={Gauge}
            label="Miles Driven"
            value={pageMiles.toLocaleString()}
            hint="on this page"
          />
          <LogStatCard
            icon={DollarSign}
            label="Reimbursement"
            value={formatCurrency(pageReimbursement)}
            hint="on this page"
          />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Trip</DialogTitle>
              <DialogDescription>
                Record a trip — total miles and reimbursement are calculated
                automatically.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Destination" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="countiesMarketed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Counties Marketed</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Counties Marketed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="beginningMileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beginning Mileage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            placeholder="Enter Beginning Mileage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endingMileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ending Mileage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            placeholder="Enter Ending Mileage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="rateType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Rate Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FEDERAL">Federal</SelectItem>
                          <SelectItem value="STATE">State</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <FormField
                    control={form.control}
                    name="totalMiles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Miles</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ratePerMile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate / Mile</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reimbursementAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Cost</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMileageMutation.isPending}
                  >
                    {createMileageMutation.isPending && (
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
              <ReusableTable<MileageLogRow>
                data={rows}
                columns={[
                  {
                    key: "destination",
                    header: "Destination",
                    render: (row) => (
                      <span className="font-medium text-gray-900">
                        {row.destination}
                      </span>
                    ),
                  },
                  {
                    key: "countiesMarketed",
                    header: "Counties Marketed",
                    render: (row) => (
                      <span
                        className="block max-w-48 truncate text-gray-600"
                        title={row.countiesMarketed ?? ""}
                      >
                        {row.countiesMarketed}
                      </span>
                    ),
                  },
                  {
                    key: "totalMiles",
                    header: "Miles",
                    render: (row) => (
                      <span className="tabular-nums">
                        {row.totalMiles?.toLocaleString() ?? "—"}
                      </span>
                    ),
                  },
                  {
                    key: "rateType",
                    header: "Rate Type",
                    render: (row) => (
                      <Badge variant="outline" className="font-medium">
                        {formatCapitalize(row.rateType)}
                      </Badge>
                    ),
                  },
                  {
                    key: "ratePerMile",
                    header: "Rate / Mile",
                    render: (row) => (
                      <span className="tabular-nums text-gray-600">
                        {formatCurrency(row.ratePerMile)}
                      </span>
                    ),
                  },
                  {
                    key: "reimbursementAmount",
                    header: "Reimbursement",
                    render: (row) => (
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(row.reimbursementAmount)}
                      </span>
                    ),
                  },
                  {
                    key: "action",
                    header: "",
                    render: (row) => (
                      <LogRowDelete
                        entityLabel="mileage entry"
                        disabled={deleteMileageMutation.isPending}
                        onDelete={() => deleteMileageMutation.mutate(row.id)}
                      />
                    ),
                  },
                ]}
                currentPage={filterMeta.page}
                itemsPerPage={filterMeta.limit}
                onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
                totalCount={totalEntries}
                emptyMessage="No mileage logs found"
                isLoading={isLoading}
              />
            ) : (
              <LogEmptyState
                icon={Route}
                title="No trips logged yet"
                description="Log your first trip to start tracking miles and reimbursements."
                actionLabel="Log Trip"
                onAction={() => setOpen(true)}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MileageLogPage;
