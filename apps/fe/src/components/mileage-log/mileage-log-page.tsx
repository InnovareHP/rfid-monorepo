import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import type { MileageLogRow } from "@/lib/types";
import { formatCapitalize } from "@/lib/utils";
import {
  createMileageLog,
  deleteMileageLog,
  getMileageLogs,
} from "@/services/mileage/mileage-service";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";
import { ReusableTable } from "../reusable-table/generic-table";

/* ✅ AUTO RATES */
const FEDERAL_RATE = 0.67;
const STATE_RATE = 0.5;

export const MileageRateType = ["FEDERAL", "STATE"] as const;

export const CreateMillageSchema = z.object({
  destination: z.string().min(1),
  countiesMarketed: z.string().min(1),
  beginningMileage: z.number().min(0),
  endingMileage: z.number().min(0),
  totalMiles: z.number().min(0),
  rateType: z.enum(MileageRateType),
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
  });

  const deleteMileageMutation = useMutation({
    mutationFn: deleteMileageLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mileage-logs"] });
      toast.success("Mileage log deleted successfully!");
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

  const totalMiles =
    endingMileage >= beginningMileage ? endingMileage - beginningMileage : 0;

  const ratePerMile =
    rateType === "FEDERAL"
      ? FEDERAL_RATE
      : rateType === "STATE"
        ? STATE_RATE
        : 0;

  const reimbursementAmount = Number((totalMiles * ratePerMile).toFixed(2));

  form.setValue("totalMiles", totalMiles);
  form.setValue("ratePerMile", ratePerMile);
  form.setValue("reimbursementAmount", reimbursementAmount);

  const onSubmit = (values: CreateMileageFormValues) => {
    createMileageMutation.mutate(values);
  };

  const handleDelete = (id: string) => {
    deleteMileageMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Mileage Log</h1>
      <div className="max-w-7xl mx-auto space-y-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Create New Mileage Entry
                </CardTitle>
                <CardDescription>Add a Mileage Log</CardDescription>
              </CardHeader>
            </Card>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
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
                    </FormItem>
                  )}
                />

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
                    </FormItem>
                  )}
                />

                {/* ✅ AUTO FIELDS */}
                <FormField
                  control={form.control}
                  name="totalMiles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Miles</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          disabled
                          placeholder="Enter Total Miles"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ratePerMile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Per Mile</FormLabel>
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

                <DialogFooter>
                  <Button type="submit">Create Entry</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        <Card className="overflow-hidden border border-gray-200">
          <div className="overflow-x-auto p-4">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Loading mileage logs...
              </div>
            ) : mileageLogsData?.data &&
              Array.isArray(mileageLogsData?.data) &&
              mileageLogsData?.data?.length > 0 ? (
              <ReusableTable<MileageLogRow>
                data={
                  Array.isArray(mileageLogsData?.data)
                    ? mileageLogsData.data
                    : []
                }
                columns={[
                  {
                    key: "destination",
                    header: "Destination",
                    render: (row) => row.destination,
                  },
                  {
                    key: "countiesMarketed",
                    header: "Counties Marketed",
                    render: (row) => row.countiesMarketed,
                  },
                  {
                    key: "rateType",
                    header: "Rate Type",
                    render: (row) => formatCapitalize(row.rateType),
                  },
                  {
                    key: "ratePerMile",
                    header: "Rate / Mile",
                    render: (row) => `$${row.ratePerMile.toFixed(2)}`,
                  },
                  {
                    key: "reimbursementAmount",
                    header: "Reimbursement",
                    render: (row) => `$${row.reimbursementAmount}`,
                  },
                  {
                    key: "action",
                    header: "Action",
                    render: (row) => (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(row.id)}
                      >
                        Delete
                      </Button>
                    ),
                  },
                ]}
                currentPage={filterMeta.page}
                itemsPerPage={filterMeta.limit}
                onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
                totalCount={mileageLogsData?.total ?? 0}
                emptyMessage="No mileage logs found"
                isLoading={isLoading}
              />
            ) : (
              <div className="p-10 text-center text-gray-500 text-sm">
                No mileage logs found. Click the card above to create your first
                entry.
              </div>
            )}
          </div>
        </Card>
        {/* TABLE LEFT UNCHANGED */}
      </div>
    </div>
  );
};

export default MileageLogPage;
