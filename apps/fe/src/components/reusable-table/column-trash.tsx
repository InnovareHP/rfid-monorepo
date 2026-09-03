import { boardQueryKey } from "@/lib/helper/board-query-key";
import {
  getDeletedColumns,
  restoreColumnField,
  type DeletedColumn,
} from "@/services/lead/lead-service";
import { formatDate } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

// Restoring lives beside creating because that is where someone lands when a
// column they binned turns out to still be needed.
export function ColumnTrash({ moduleType }: { moduleType: string }) {
  const queryClient = useQueryClient();

  const { data: columns = [], isLoading } = useQuery({
    queryKey: ["column-trash", moduleType],
    queryFn: () => getDeletedColumns(moduleType),
    staleTime: 1000 * 60,
  });

  const restoreMutation = useMutation({
    mutationFn: (columnId: string) => restoreColumnField(columnId, moduleType),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["column-trash"] });
      await queryClient.invalidateQueries({
        queryKey: boardQueryKey(moduleType),
      });
      toast.success("Column restored");
    },
    // The server refuses a restore that would collide with a live column, and
    // that reason is the whole message.
    onError: (error) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to restore column"
      ),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
        <Spinner size="sm" />
        Loading deleted columns...
      </div>
    );
  }

  if (columns.length === 0) return null;

  return (
    <div className="border-t px-6 py-4">
      <p className="text-sm font-medium">Deleted columns</p>
      <p className="text-sm text-muted-foreground">
        Restoring a column brings back the values its records still hold.
      </p>

      <ul className="mt-3 space-y-2">
        {columns.map((column: DeletedColumn) => (
          <li
            key={column.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{column.fieldName}</p>
              <p className="text-xs text-muted-foreground">
                {column.deletedAt
                  ? `Deleted ${formatDate(column.deletedAt)}`
                  : "Deleted"}
                {column.deleter ? ` by ${column.deleter.name}` : ""}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate(column.id)}
            >
              <RotateCcw className="mr-2 size-4" />
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
