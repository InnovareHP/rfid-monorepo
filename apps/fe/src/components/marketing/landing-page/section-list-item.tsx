import type { LandingSection } from "@/services/marketing/landing-page-service";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

const LABEL_BY_TYPE: Record<LandingSection["type"], string> = {
  HERO: "Hero",
  TEXT: "Text",
  IMAGE: "Image",
  FORM_EMBED: "Form embed",
  CTA: "Call to action",
};

const previewFor = (section: LandingSection): string => {
  switch (section.type) {
    case "HERO":
      return section.props.heading || "Untitled hero";
    case "TEXT":
      return section.props.heading || section.props.body.slice(0, 40);
    case "IMAGE":
      return section.props.caption || section.props.src || "No image set";
    case "FORM_EMBED":
      return section.props.heading || "Embedded form";
    case "CTA":
      return section.props.buttonLabel || "Untitled button";
    default:
      return "";
  }
};

type SectionListItemProps = {
  section: LandingSection;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export const SectionListItem = ({
  section,
  selected,
  onSelect,
  onRemove,
}: SectionListItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={() => onSelect(section.id)}
      className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer ${
        selected
          ? "border-gray-900 bg-gray-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <button
        type="button"
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500">
          {LABEL_BY_TYPE[section.type]}
        </p>
        <p className="text-sm text-gray-900 truncate">{previewFor(section)}</p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(section.id);
        }}
        className="text-gray-300 hover:text-red-500 shrink-0"
        aria-label="Remove section"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
