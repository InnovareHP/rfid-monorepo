import { formatCurrency } from "@/lib/helper/helper";
import {
  createExpenseLog,
  deleteExpenseLog,
  getExpenseLogs,
} from "@/services/expense/expense-service";
import { deleteImage, uploadImage } from "@/services/image/image-service";
import { formatDateTime } from "@dashboard/shared";
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
import { ReceiptImagePicker } from "@dashboard/ui/components/ImageUpload";
import { Input } from "@dashboard/ui/components/input";
import { ReceiptViewer } from "@dashboard/ui/components/receipt-viewer";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, DollarSign, Loader2, Receipt } from "lucide-react";
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

export const CreateExpenseSchema = z.object({
  amount: z.coerce.number().min(1, "Enter an amount"),
  description: z.string().min(1, "Enter a description"),
  notes: z.string(),
  image: z.instanceof(File, { message: "Attach a receipt image" }),
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
    mutationFn: async (values: CreateExpenseFormValues) => {
      const image = await uploadImage(values.image);
      if (!image?.url) throw new Error("Failed to upload receipt image");

      try {
        return await createExpenseLog({ ...values, image: image.url });
      } catch (error) {
        await deleteImage(image.id);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-logs"] });
      toast.success("Expense log created successfully!");
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create expense log");
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => await deleteExpenseLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-logs"] });
      toast.success("Expense log deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
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

  const onSubmit = (values: CreateExpenseFormValues) => {
    createExpenseMutation.mutate(values);
  };

  const rows: any[] = Array.isArray(expenseLogsQuery.data?.data)
    ? expenseLogsQuery.data.data
    : [];
  const totalEntries = expenseLogsQuery.data?.total ?? 0;

  const pageAmount = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const lastEntry = rows[0]?.createdAt ? formatDateTime(rows[0].createdAt) : "—";

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <LogPageHeader
          icon={Receipt}
          title="Expense Log"
          subtitle="Track expenses and receipts for reimbursement"
          actionLabel="Log Expense"
          onAction={() => setOpen(true)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <LogStatCard
            icon={Receipt}
            label="Total Expenses"
            value={String(totalEntries)}
          />
          <LogStatCard
            icon={DollarSign}
            label="Amount"
            value={formatCurrency(pageAmount)}
            hint="on this page"
          />
          <LogStatCard
            icon={CalendarClock}
            label="Last Entry"
            value={lastEntry}
          />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Expense</DialogTitle>
              <DialogDescription>
                Record an expense with its receipt for reimbursement.
              </DialogDescription>
            </DialogHeader>
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
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
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
                        <Textarea
                          rows={4}
                          placeholder="Enter Notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt</FormLabel>
                      <FormControl>
                        <ReceiptImagePicker onSelect={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                  >
                    {createExpenseMutation.isPending && (
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
            {expenseLogsQuery.isLoading ? (
              <LogTableSkeleton />
            ) : rows.length > 0 ? (
              <ReusableTable
                data={rows}
                columns={[
                  {
                    key: "amount",
                    header: "Amount",
                    render: (row: any) => (
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(row.amount ?? 0)}
                      </span>
                    ),
                  },
                  {
                    key: "description",
                    header: "Description",
                    render: (row: any) => (
                      <span
                        className="block max-w-64 truncate"
                        title={row.description ?? ""}
                      >
                        {row.description}
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
                    key: "createdAt",
                    header: "Logged",
                    render: (row: any) => (
                      <span className="text-gray-500 whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </span>
                    ),
                  },
                  {
                    key: "receipt",
                    header: "Receipt",
                    render: (row: any) => (
                      <ReceiptViewer url={row.imageUrl} label="View Receipt" />
                    ),
                  },
                  {
                    key: "action",
                    header: "",
                    render: (row: any) => (
                      <LogRowDelete
                        entityLabel="expense"
                        disabled={deleteExpenseMutation.isPending}
                        onDelete={() => deleteExpenseMutation.mutate(row.id)}
                      />
                    ),
                  },
                ]}
                currentPage={filterMeta.page}
                itemsPerPage={filterMeta.limit}
                onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
                totalCount={totalEntries}
                emptyMessage="No expense logs found"
                isLoading={expenseLogsQuery.isLoading}
              />
            ) : (
              <LogEmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Log your first expense with a receipt to start tracking reimbursements."
                actionLabel="Log Expense"
                onAction={() => setOpen(true)}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseLogPage;
