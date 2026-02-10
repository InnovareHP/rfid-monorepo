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
import { formatDateTime } from "@/lib/utils";
import {
  createExpenseLog,
  getExpenseLogs,
} from "@/services/expense/expense-service";
import { deleteImage, uploadImage } from "@/services/image/image-service";
import { deleteMarketLog } from "@/services/market/market-service";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";
import { ReusableTable } from "../reusable-table/generic-table";
import { ReceiptImagePicker } from "@dashboard/ui/components/ImageUpload";
import { ReceiptViewer } from "@dashboard/ui/components/receipt-viewer";
import { Textarea } from "@dashboard/ui/components/textarea";

export const CreateExpenseSchema = z.object({
  amount: z.coerce.number().min(1),
  description: z.string().min(1),
  notes: z.string(),
  image: z.instanceof(File).optional(),
});

export type CreateExpenseFormValues = z.infer<typeof CreateExpenseSchema>;

const ExpenseLogPage = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const [filterMeta, setFilterMeta] = useState({
    page: 1,
    limit: 20,
  });

  const expenseLogsQuery = useQuery({
    queryKey: ["expense-logs", filterMeta],
    queryFn: () => getExpenseLogs(filterMeta),
  });

  const createExpenseMutation = useMutation({
    mutationFn: createExpenseLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-logs"] });
      toast.success("Expense log created successfully!");
      form.reset();
      setOpen(false);
    },
  });

  const deleteMarketMutation = useMutation({
    mutationFn: async (id: string) => await deleteMarketLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-logs"] });
      toast.success("Market log deleted successfully!");
    },
  });

  const form = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      amount: 0,
      description: "",
      notes: "",
      image: undefined,
    },
  });

  const onSubmit = async (values: CreateExpenseFormValues) => {
    const image = await uploadImage(values.image as File);

    if (!image?.url) throw new Error("Failed to upload image");

    try {
      createExpenseMutation.mutate({
        ...values,
        image: image.url,
      });
    } catch (error) {
      await deleteImage(image.id);

      toast.error("Failed to create expense log");
    }
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
                  <Plus className="w-5 h-5" /> Create New Expense Entry
                </CardTitle>
                <CardDescription>Add a Expense Log</CardDescription>
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter Description" />
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
                        <Textarea
                          rows={4}
                          placeholder="Enter Notes"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ReceiptImagePicker onSelect={field.onChange} />
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
            {expenseLogsQuery.isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Loading expense logs...
              </div>
            ) : expenseLogsQuery.data?.data &&
              Array.isArray(expenseLogsQuery.data?.data) &&
              expenseLogsQuery.data?.data?.length > 0 ? (
              <ReusableTable
                data={
                  Array.isArray(expenseLogsQuery.data?.data)
                    ? expenseLogsQuery.data.data
                    : []
                }
                columns={[
                  {
                    key: "amount",
                    header: "Amount",
                    render: (row: any) => `$${row.amount}`,
                  },

                  {
                    key: "createdAt",
                    header: "Created At",
                    render: (row: any) => formatDateTime(row.createdAt),
                  },
                  {
                    key: "description",
                    header: "Description",
                    render: (row: any) => row.description,
                  },
                  {
                    key: "notes",
                    header: "Notes",
                    render: (row: any) => row.notes,
                  },
                  {
                    key: "receipt",
                    header: "Receipt",
                    render: (row: any) => (
                      <div className="flex items-center gap-2">
                        <ReceiptViewer
                          url={row.imageUrl}
                          label="View Receipt"
                        />
                      </div>
                    ),
                  },
                  {
                    key: "action",
                    header: "Action",
                    render: (row: any) => (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(row.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ),
                  },
                ]}
                currentPage={filterMeta.page}
                itemsPerPage={filterMeta.limit}
                onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
                totalCount={expenseLogsQuery.data?.total ?? 0}
                emptyMessage="No mileage logs found"
                isLoading={expenseLogsQuery.isLoading}
              />
            ) : (
              <div className="p-10 text-center text-gray-500 text-sm">
                No Expense logs found. Click the card above to create your first
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

export default ExpenseLogPage;
