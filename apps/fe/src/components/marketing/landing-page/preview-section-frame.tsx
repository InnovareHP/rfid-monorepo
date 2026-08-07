import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

type PreviewSectionFrameProps = {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
};

export const PreviewSectionFrame = ({
  id,
  selected,
  onSelect,
  children,
}: PreviewSectionFrameProps) => {
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
      className={`cursor-pointer border-b border-dashed border-gray-200 last:border-b-0 ${
        selected ? "ring-2 ring-inset ring-primary" : "hover:bg-gray-50/50"
      }`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};
