import type { CustomAnalyticTileSpan } from "@/services/custom-analytics/custom-analytics-service";
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { Copy, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

const WIDTHS: { value: CustomAnalyticTileSpan; label: string }[] = [
  { value: "THIRD", label: "One third" },
  { value: "HALF", label: "Half" },
  { value: "TWO_THIRDS", label: "Two thirds" },
  { value: "FULL", label: "Full width" },
];

type CustomAnalyticTileMenuProps = {
  name: string;
  tileSpan: CustomAnalyticTileSpan;
  onEdit: () => void;
  onDuplicate: () => void;
  onWidthChange: (tileSpan: CustomAnalyticTileSpan) => void;
  onDelete: () => void;
  // Absent when the dashboard's membership is fixed, as a module's page is.
  onRemove?: () => void;
};

export function CustomAnalyticTileMenu({
  name,
  tileSpan,
  onEdit,
  onDuplicate,
  onWidthChange,
  onDelete,
  onRemove,
}: CustomAnalyticTileMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label={`Actions for ${name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit chart
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Width</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={tileSpan}
            onValueChange={(value) =>
              onWidthChange(value as CustomAnalyticTileSpan)
            }
          >
            {WIDTHS.map((width) => (
              <DropdownMenuRadioItem key={width.value} value={width.value}>
                {width.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          {onRemove && (
            <DropdownMenuItem onSelect={onRemove}>
              <X className="h-4 w-4" />
              Remove from dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete chart
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the chart everywhere, including any other dashboard
              it appears on. Removing it from this dashboard only leaves the
              chart intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
