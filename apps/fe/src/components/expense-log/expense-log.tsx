import ColumnFilter from "@/components/master-list/column-filter";
import { WriteGate } from "@/components/write-gate";
import { useLogDelete, useLogTable } from "@/hooks/use-log-table";
import { formatCurrency } from "@/lib/helper/helper";
import {
  bulkDeleteExpenseLogs,
  createExpenseLog,
  getExpenseLogs,
} from "@/services/expense/expense-service";
import { deleteImage, uploadImage } from "@/services/image/image-service";
import { formatDateTime } from "@dashboard/shared";
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
import { ReceiptImagePicker } from "@dashboard/ui/components/ImageUpload";
import { Input } from "@dashboard/ui/components/input";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";
import { LogEmptyState, LogStatCard } from "../log-shared/log-page-shell";
import { LogTable } from "../log-shared/log-table";
import { expenseLogColumns, type ExpenseLogRow } from "./expense-log-columns";

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
      filter: logDateFilter(range, "expenseDateFrom", "expenseDateTo"),
    }));
  };

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
        await deleteImage(image.public_id);
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

  const deleteExpenseMutation = useLogDelete(
    "expense-logs",
    bulkDeleteExpenseLogs
  );

  const { mutate: deleteRow, isPending: isDeleting } = deleteExpenseMutation;

  const columns = useMemo(
    () =>
      expenseLogColumns(
        (id) =>
          deleteRow([id], {
            onSuccess: () => toast.success("Expense log deleted successfully!"),
            onError: (error) => toast.error(error.message),
          }),
        isDeleting
      ),
    [deleteRow, isDeleting]
  );

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

  const rows: ExpenseLogRow[] = expenseLogsQuery.data?.data ?? [];
  const totalEntries = expenseLogsQuery.data?.total ?? 0;

  const { table, hideableColumns, onColumnOrderChange } = useLogTable(
    "expense-log",
    rows,
    columns
  );

  const pageAmount = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const lastEntry = rows[0]?.createdAt
    ? formatDateTime(rows[0].createdAt)
    : "—";

  return (
    <div className="page-style">
      <div className="space-y-6">
        <PageHeader
          title="Expense Log"
          description="Track expenses and receipts for reimbursement"
        >
          <LogDateFilter value={dateRange} onChange={handleDateChange} />
          <ColumnFilter tableColumns={hideableColumns} />
          <WriteGate>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Log Expense
            </Button>
          </WriteGate>
        </PageHeader>

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

        {!expenseLogsQuery.isLoading && rows.length === 0 ? (
          <Card className="overflow-hidden border border-border">
            <LogEmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Log your first expense with a receipt to start tracking reimbursements."
              actionLabel="Log Expense"
              onAction={() => setOpen(true)}
            />
          </Card>
        ) : (
          <LogTable
            table={table}
            isLoading={expenseLogsQuery.isLoading}
            totalCount={totalEntries}
            meta={filterMeta}
            onMetaChange={(meta) =>
              setFilterMeta((prev) => ({ ...prev, ...meta }))
            }
            onDelete={deleteExpenseMutation.mutateAsync}
            onColumnOrderChange={onColumnOrderChange}
            emptyMessage="No expense logs found"
          />
        )}
      </div>
    </div>
  );
};

export default ExpenseLogPage;
