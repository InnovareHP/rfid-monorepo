import type { BoardField } from "@/services/marketing/form-service";
import { Plus } from "lucide-react";

type FormFieldPickerProps = {
  fields: BoardField[];
  mappedFieldIds: Set<string>;
  onAdd: (field: BoardField) => void;
};

export const FormFieldPicker = ({
  fields,
  mappedFieldIds,
  onAdd,
}: FormFieldPickerProps) => {
  const available = fields.filter((field) => !mappedFieldIds.has(field.id));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        Available fields
      </h3>
      {available.length === 0 ? (
        <p className="text-sm text-gray-400">
          All fields are already on this form.
        </p>
      ) : (
        <div className="space-y-1">
          {available.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => onAdd(field)}
              className="w-full flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="truncate">{field.fieldName}</span>
              <Plus className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
