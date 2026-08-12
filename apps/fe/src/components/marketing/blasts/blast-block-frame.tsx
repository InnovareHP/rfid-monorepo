import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@dashboard/ui/lib/utils";
import type { ReactNode } from "react";

type BlastBlockFrameProps = {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
};

export const BlastBlockFrame = ({
  id,
  selected,
  onSelect,
  children,
}: BlastBlockFrameProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={() => onSelect(id)}
      className={cn(
        "cursor-pointer border-b border-dashed border-border last:border-b-0",
        selected ? "ring-2 ring-inset ring-primary" : "hover:bg-muted/40"
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};
