import type { FormBuilderValues } from "@/components/marketing/forms/form-builder-schema";
import { FormFieldItem } from "@/components/marketing/forms/form-field-item";
import { FormFieldPicker } from "@/components/marketing/forms/form-field-picker";
import type { BoardField } from "@/services/marketing/form-service";
import { FormField, FormItem, FormMessage } from "@dashboard/ui/components/form";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { UseFormReturn } from "react-hook-form";

type FormFieldsPanelProps = {
  form: UseFormReturn<FormBuilderValues>;
  fields: BoardField[];
};

export const FormFieldsPanel = ({ form, fields }: FormFieldsPanelProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  return (
    <FormField
      control={form.control}
      name="fieldMappings"
      render={({ field }) => {
        const mappings = field.value;
        const mappedFieldIds = new Set(mappings.map((m) => m.fieldId));

        const handleDragEnd = (event: DragEndEvent) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const oldIndex = mappings.findIndex((m) => m.fieldId === active.id);
          const newIndex = mappings.findIndex((m) => m.fieldId === over.id);
          if (oldIndex === -1 || newIndex === -1) return;
          field.onChange(arrayMove(mappings, oldIndex, newIndex));
        };

        return (
          <FormItem className="space-y-4">
            <FormFieldPicker
              fields={fields}
              mappedFieldIds={mappedFieldIds}
              onAdd={(boardField) =>
                field.onChange([
                  ...mappings,
                  {
                    fieldId: boardField.id,
                    label: boardField.fieldName,
                    required: false,
                  },
                ])
              }
            />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Mapped fields
              </h3>
              {mappings.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Add fields above to build this form.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={mappings.map((m) => m.fieldId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {mappings.map((mapping) => (
                        <FormFieldItem
                          key={mapping.fieldId}
                          mapping={mapping}
                          fieldType={
                            fields.find(
                              (boardField) => boardField.id === mapping.fieldId
                            )?.fieldType ?? "TEXT"
                          }
                          onLabelChange={(fieldId, label) =>
                            field.onChange(
                              mappings.map((m) =>
                                m.fieldId === fieldId ? { ...m, label } : m
                              )
                            )
                          }
                          onRequiredChange={(fieldId, required) =>
                            field.onChange(
                              mappings.map((m) =>
                                m.fieldId === fieldId ? { ...m, required } : m
                              )
                            )
                          }
                          onRemove={(fieldId) =>
                            field.onChange(
                              mappings.filter((m) => m.fieldId !== fieldId)
                            )
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
