import {
  getForm,
  getFormFields,
  publishForm,
  updateForm,
  type BoardField,
  type FormFieldMapping,
  type MarketingForm,
} from "@/services/marketing/form-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Copy, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormFieldItem } from "./form-field-item";
import { FormFieldPicker } from "./form-field-picker";
import { FormSettingsPanel } from "./form-settings-panel";

export const MarketingFormBuilderPage = () => {
  const { formId } = useParams({ strict: false }) as { formId: string };

  const { data: form, isLoading } = useQuery({
    queryKey: ["marketing-form", formId],
    queryFn: () => getForm(formId),
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["marketing-form-fields", formId],
    queryFn: () => getFormFields(formId),
  });

  if (isLoading || !form) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  return <FormBuilder key={form.id} form={form} fields={fields} />;
};

function FormBuilder({
  form,
  fields,
}: {
  form: MarketingForm;
  fields: BoardField[];
}) {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formId = form.id;

  const [name, setName] = useState(form.name);
  const [mappings, setMappings] = useState<FormFieldMapping[]>(
    form.fieldMappings
  );
  const [submitButtonText, setSubmitButtonText] = useState(
    form.submitButtonText
  );
  const [redirectUrl, setRedirectUrl] = useState(form.redirectUrl ?? "");

  const mappedFieldIds = new Set(mappings.map((m) => m.fieldId));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      updateForm(formId, {
        name,
        fieldMappings: mappings,
        submitButtonText,
        redirectUrl: redirectUrl || undefined,
      }),
    onSuccess: () => {
      toast.success("Form saved");
      queryClient.invalidateQueries({ queryKey: ["marketing-form", formId] });
      queryClient.invalidateQueries({ queryKey: ["marketing-forms"] });
    },
    onError: () => toast.error("Failed to save form"),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishForm(formId),
    onSuccess: () => {
      toast.success("Form published");
      queryClient.invalidateQueries({ queryKey: ["marketing-form", formId] });
      queryClient.invalidateQueries({ queryKey: ["marketing-forms"] });
    },
    onError: () => toast.error("Failed to publish form"),
  });

  const handleAdd = (field: BoardField) => {
    setMappings((prev) => [
      ...prev,
      { fieldId: field.id, label: field.fieldName, required: false },
    ]);
  };

  const handleRemove = (fieldId: string) => {
    setMappings((prev) => prev.filter((m) => m.fieldId !== fieldId));
  };

  const handleLabelChange = (fieldId: string, label: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.fieldId === fieldId ? { ...m, label } : m))
    );
  };

  const handleRequiredChange = (fieldId: string, required: boolean) => {
    setMappings((prev) =>
      prev.map((m) => (m.fieldId === fieldId ? { ...m, required } : m))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = mappings.findIndex((m) => m.fieldId === active.id);
    const newIndex = mappings.findIndex((m) => m.fieldId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setMappings((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
    toast.success("Link copied");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({ to: "/$team/marketing/forms", params: { team } })
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="text-lg font-semibold w-64"
            />
            <Badge variant={form.status === "PUBLISHED" ? "default" : "outline"}>
              {form.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {form.status === "DRAFT" && (
              <Button
                variant="outline"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                Publish
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>

        {form.status === "PUBLISHED" && (
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <Copy className="h-3.5 w-3.5" />
            {`${window.location.origin}/f/${form.slug}`}
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FormFieldPicker
              fields={fields}
              mappedFieldIds={mappedFieldIds}
              onAdd={handleAdd}
            />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Mapped fields
            </h3>
            {mappings.length === 0 ? (
              <p className="text-sm text-gray-400">
                Add fields from the left panel to build this form.
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
                        onLabelChange={handleLabelChange}
                        onRequiredChange={handleRequiredChange}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <FormSettingsPanel
              submitButtonText={submitButtonText}
              redirectUrl={redirectUrl}
              onSubmitButtonTextChange={setSubmitButtonText}
              onRedirectUrlChange={setRedirectUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
