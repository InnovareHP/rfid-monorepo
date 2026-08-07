import type { BoardField } from "@/services/marketing/form-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Plus } from "lucide-react";
import { fieldTypeLabel } from "./field-type-label";

// Types an anonymous visitor cannot fill: they reference internal records or users.
const INTERNAL_FIELD_TYPES = new Set([
  "ASSIGNED_TO",
  "TIMELINE",
  "PERSON",
  "REFERRAL_LINK",
  "CONTACT_LINK",
  "COMPANY_LINK",
]);

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
  const available = fields.filter(
    (field) =>
      !mappedFieldIds.has(field.id) && !INTERNAL_FIELD_TYPES.has(field.fieldType)
  );

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
              className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-left text-sm transition-colors hover:border-brand/40 hover:bg-blue-50/60"
            >
              <span className="min-w-0 flex-1 truncate">{field.fieldName}</span>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {fieldTypeLabel(field.fieldType)}
              </Badge>
              <Plus className="h-4 w-4 shrink-0 text-gray-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
