import { TableHead } from "@dashboard/ui/components/table";
import { cn } from "@dashboard/ui/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, type Header } from "@tanstack/react-table";
import { GripVertical } from "lucide-react";

type TableHeadCellProps<T> = {
  header: Header<T, unknown>;
  stickyLeft: boolean;
  leftOffset: number;
  sortable: boolean;
};

export function TableHeadCell<T>({
  header,
  stickyLeft,
  leftOffset,
  sortable,
}: TableHeadCellProps<T>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: header.column.id, disabled: !sortable });

  return (
    <TableHead
      ref={sortable ? setNodeRef : undefined}
      className={cn(
        "text-left text-sm font-semibold text-foreground px-4 py-3 group/header overflow-visible sticky top-0 bg-table-header",
        stickyLeft ? "z-30" : "z-20",
        isDragging && "z-40 opacity-80"
      )}
      style={{
        width: header.getSize(),
        maxWidth: header.getSize(),
        // Only the x axis moves: the header is sticky to the top of the scroll
        // container, so a y translate would tear it off that edge.
        ...(sortable && transform
          ? { transform: CSS.Translate.toString({ ...transform, y: 0 }) }
          : {}),
        ...(stickyLeft ? { position: "sticky" as const, left: leftOffset } : {}),
      }}
    >
      <div className="flex items-center gap-1 overflow-hidden">
        {sortable && (
          <button
            type="button"
            aria-label={`Reorder ${header.column.id} column`}
            className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover/header:opacity-100 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="min-w-0 flex-1 overflow-hidden text-ellipsis">
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </div>
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => header.column.resetSize()}
          className={cn(
            "absolute -right-1 top-0 h-full w-2 cursor-col-resize select-none touch-none z-50",
            header.column.getIsResizing()
              ? "bg-primary"
              : "opacity-0 group-hover/header:opacity-100 bg-muted-foreground"
          )}
          style={{ touchAction: "none" }}
        />
      )}
    </TableHead>
  );
}
