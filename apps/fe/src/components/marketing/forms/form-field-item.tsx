import type { FormFieldMapping } from "@/services/marketing/form-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { fieldTypeLabel } from "./field-type-label";

type FormFieldItemProps = {
  mapping: FormFieldMapping;
  fieldType: string;
  onLabelChange: (fieldId: string, label: string) => void;
  onRequiredChange: (fieldId: string, required: boolean) => void;
  onRemove: (fieldId: string) => void;
};

export const FormFieldItem = ({
  mapping,
  fieldType,
  onLabelChange,
  onRequiredChange,
  onRemove,
}: FormFieldItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mapping.fieldId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2"
    >
      <button
        type="button"
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={mapping.label}
        onChange={(event) => onLabelChange(mapping.fieldId, event.target.value)}
        placeholder="Field label"
        className="min-w-40 flex-1"
      />
      <Badge variant="secondary" className="shrink-0 font-normal">
        {fieldTypeLabel(fieldType)}
      </Badge>
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
        <Checkbox
          checked={mapping.required}
          onCheckedChange={(checked) =>
            onRequiredChange(mapping.fieldId, checked === true)
          }
        />
        Required
      </label>
      <button
        type="button"
        onClick={() => onRemove(mapping.fieldId)}
        className="text-gray-300 hover:text-red-500 shrink-0"
        aria-label="Remove field"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
