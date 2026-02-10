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
import { Textarea } from "@dashboard/ui/components/textarea";
import { formatDateTime } from "@/lib/utils";
import {
  createMarketLog,
  deleteMarketLog,
  getFacilityOptions,
  getMarketLogs,
} from "@/services/market/market-service";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";
import { ReusableTable } from "../reusable-table/generic-table";
import { MultiSelect } from "@dashboard/ui/components/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";

export const CreateMarketSchema = z.object({
  facility: z.string().min(1),
  touchpoint: z.array(
    z.enum([
      "IN_PERSON_MEETING",
      "LINKED_IN",
      "FACEBOOK",
      "TEXT",
      "EMAIL",
      "PHONE",
      "OTHER",
    ])
  ),
  talkedTo: z.string().min(1),
  reasonForVisit: z.string().min(1),
  notes: z.string().optional(),
});

export type CreateMarketFormValues = z.infer<typeof CreateMarketSchema>;

const MarketLogPage = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const options = [
    { label: "In Person Meeting", value: "IN_PERSON_MEETING" },
    { label: "LinkedIn", value: "LINKED_IN" },
    { label: "Facebook", value: "FACEBOOK" },
    { label: "Text", value: "TEXT" },
    { label: "Email", value: "EMAIL" },
    { label: "Phone", value: "PHONE" },
    { label: "Other", value: "OTHER" },
  ];

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
      toast.success("Market log created successfully!");
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
      toast.success("Market log deleted successfully!");
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

  const handleDelete = (id: string) => {
    deleteMarketMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Marketing Log</h1>
      <div className="max-w-7xl mx-auto space-y-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Create New Marketing Entry
                </CardTitle>
                <CardDescription>Add a Marketing Log</CardDescription>
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
                  name="facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-auto">
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
            {marketLogsQuery.isLoading || facilityOptionsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Loading mileage logs...
              </div>
            ) : marketLogsQuery.data?.data &&
              Array.isArray(marketLogsQuery.data?.data) &&
              marketLogsQuery.data?.data?.length > 0 ? (
              <ReusableTable
                data={
                  Array.isArray(marketLogsQuery.data?.data)
                    ? marketLogsQuery.data.data
                    : []
                }
                columns={[
                  {
                    key: "destination",
                    header: "Destination",
                    render: (row: any) => row.facility,
                  },
                  {
                    key: "touchpoint",
                    header: "Touchpoint",
                    render: (row: any) =>
                      row.touchpoints.join(", ").replace(/_/g, " "),
                  },
                  {
                    key: "talkedTo",
                    header: "Talked To",
                    render: (row: any) => row.talkedTo,
                  },
                  {
                    key: "reasonForVisit",
                    header: "Reason for Visit",
                    render: (row: any) => row.reasonForVisit || "—",
                  },
                  {
                    key: "createdAt",
                    header: "Created At",
                    render: (row: any) => formatDateTime(row.createdAt),
                  },
                  {
                    key: "notes",
                    header: "Notes",
                    render: (row: any) => row.notes,
                  },

                  {
                    key: "action",
                    header: "Action",
                    render: (row: any) => (
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
                totalCount={marketLogsQuery.data?.total ?? 0}
                emptyMessage="No mileage logs found"
                isLoading={marketLogsQuery.isLoading}
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

export default MarketLogPage;
