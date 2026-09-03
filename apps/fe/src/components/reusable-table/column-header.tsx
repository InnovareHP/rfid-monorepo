import { deleteColumnField } from "@/services/lead/lead-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFormFooter,
  AlertDialogFormHeader,
} from "@dashboard/ui/components/alert-dialog";
import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownAZ, ArrowUpAZ, ChevronsUpDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { toast } from "sonner";

type ColumnHeaderProps = {
  columnId: string;
  columnName: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort: (columnId: string, order: "asc" | "desc" | null) => void;
  moduleType?: string;
  canDelete?: boolean;
};

export function ColumnHeader({
  columnId,
  columnName,
  sortBy,
  sortOrder,
  onSort,
  moduleType = "LEAD",
  canDelete = true,
}: ColumnHeaderProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const isActive = sortBy === columnId;
  const currentOrder = isActive ? sortOrder : null;

  const handleSort = (order: "asc" | "desc") => {
    if (currentOrder === order) {
      onSort(columnId, null);
    } else {
      onSort(columnId, order);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteColumnField(columnId, moduleType);
      toast.success(`Column "${columnName}" deleted`);
      queryClient.invalidateQueries({
        queryKey: boardQueryKey(moduleType ?? "LEAD"),
      });
    } catch (error) {
      // The server refuses a column that still holds data, and that reason is
      // the whole point of the message — a generic failure would hide it.
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete column"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"ghost"}
            className="flex justify-between w-full gap-1 px-0 font-semibold text-foreground hover:text-primary transition-colors cursor-pointer select-none"
          >
            <span>{columnName}</span>
            {isActive && currentOrder === "asc" && (
              <ArrowUpAZ className="h-3.5 w-3.5 text-foreground" />
            )}
            {isActive && currentOrder === "desc" && (
              <ArrowDownAZ className="h-3.5 w-3.5 text-foreground" />
            )}
            {!isActive && (
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem
            onClick={() => handleSort("asc")}
            className={currentOrder === "asc" ? "bg-primary/10" : ""}
          >
            <ArrowUpAZ className="h-4 w-4 mr-2" />
            Sort A to Z
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSort("desc")}
            className={currentOrder === "desc" ? "bg-primary/10" : ""}
          >
            <ArrowDownAZ className="h-4 w-4 mr-2" />
            Sort Z to A
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Column
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent variant="shell" className="sm:max-w-lg">
          <AlertDialogFormHeader
            icon={<Trash2 />}
            iconClassName="bg-destructive text-destructive-foreground"
            title={`Delete "${columnName}" column?`}
            description="A column can only be deleted while it is empty. If any record still has a value here, the delete is refused and nothing changes."
          />
          <AlertDialogFormFooter>
            <AlertDialogCancel asChild disabled={isDeleting}>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              asChild
            >
              <Button variant="destructive">
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFormFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
