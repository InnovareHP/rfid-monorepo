import { deleteColumnField } from "@/services/lead/lead-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";
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
        queryKey: [moduleType === "REFERRAL" ? "referrals" : "leads"],
      });
    } catch {
      toast.error("Failed to delete column");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"ghost"}
            className="flex justify-between w-full gap-1 hover:text-blue-700 transition-colors cursor-pointer select-none"
          >
            <span>{columnName}</span>
            {isActive && currentOrder === "asc" && (
              <ArrowUpAZ className="h-3.5 w-3.5 text-blue-600" />
            )}
            {isActive && currentOrder === "desc" && (
              <ArrowDownAZ className="h-3.5 w-3.5 text-blue-600" />
            )}
            {!isActive && <ChevronDown className="h-3.5 w-3.5 opacity-50" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem
            onClick={() => handleSort("asc")}
            className={currentOrder === "asc" ? "bg-blue-50" : ""}
          >
            <ArrowUpAZ className="h-4 w-4 mr-2" />
            Sort A to Z
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSort("desc")}
            className={currentOrder === "desc" ? "bg-blue-50" : ""}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{columnName}" column?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the column and hide its data from all records.
              This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              asChild
            >
              <Button variant={"destructive"}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
