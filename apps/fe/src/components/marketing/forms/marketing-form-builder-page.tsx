import { BuilderPageSkeleton } from "@/components/skeletons/builder-page-skeleton";
import {
  formBuilderSchema,
  type FormBuilderValues,
} from "@/components/marketing/forms/form-builder-schema";
import { FormFieldsPanel } from "@/components/marketing/forms/form-fields-panel";
import { FormRenderer } from "@/components/marketing/forms/form-renderer";
import { FormSettingsPanel } from "@/components/marketing/forms/form-settings-panel";
import {
  getForm,
  getFormFields,
  publishForm,
  updateForm,
  type PublicForm,
} from "@/services/marketing/form-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Form } from "@dashboard/ui/components/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, PencilLine, Send } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

export const MarketingFormBuilderPage = () => {
  const { team, formId } = useParams({ strict: false }) as {
    team: string;
    formId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("fields");

  const { data: marketingForm, isLoading } = useQuery({
    queryKey: ["marketing-form", formId],
    queryFn: () => getForm(formId),
  });

  const { data: boardFields = [] } = useQuery({
    queryKey: ["marketing-form-fields", formId],
    queryFn: () => getFormFields(formId),
  });

  const form = useForm<FormBuilderValues>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: {
      name: "",
      submitButtonText: "Submit",
      redirectUrl: "",
      fieldMappings: [],
    },
    values: marketingForm
      ? {
          name: marketingForm.name,
          submitButtonText: marketingForm.submitButtonText,
          redirectUrl: marketingForm.redirectUrl ?? "",
          fieldMappings: marketingForm.fieldMappings,
        }
      : undefined,
  });

  const name = useWatch({ control: form.control, name: "name" });
  const submitButtonText = useWatch({
    control: form.control,
    name: "submitButtonText",
  });
  const fieldMappings = useWatch({ control: form.control, name: "fieldMappings" });

  const saveMutation = useMutation({
    mutationFn: (values: FormBuilderValues) =>
      updateForm(formId, {
        name: values.name,
        fieldMappings: values.fieldMappings,
        submitButtonText: values.submitButtonText,
        redirectUrl: values.redirectUrl || undefined,
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

  if (isLoading || !marketingForm) {
    return <BuilderPageSkeleton />;
  }

  const publicUrl = `${window.location.origin}/f/${marketingForm.slug}`;

  const previewForm: PublicForm = {
    id: marketingForm.id,
    name,
    submitButtonText: submitButtonText || "Submit",
    fieldMappings: fieldMappings.map((mapping) => {
      const boardField = boardFields.find(
        (field) => field.id === mapping.fieldId
      );

      return {
        ...mapping,
        fieldType: boardField?.fieldType ?? "TEXT",
        options: boardField?.options ?? [],
      };
    }),
  };

  return (
    <Form {...form}>
      <div className="flex min-h-full flex-col bg-gray-50">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                navigate({ to: "/$team/marketing/forms", params: { team } })
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="page-title text-3xl font-semibold tracking-tight sm:text-4xl">
              {name}
            </h1>
            <Badge variant="outline" className="gap-1 text-gray-500">
              <PencilLine className="h-3 w-3" />
              {marketingForm.status === "PUBLISHED" ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Draft
            </Button>
            <Button
              type="button"
              className="bg-brand text-white hover:bg-brand/90"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              <Send className="mr-1 h-4 w-4" />
              Publish
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.02)_6px,rgba(0,0,0,0.02)_12px)] p-8">
            <div className="mx-auto w-full max-w-2xl rounded-xl bg-white px-7 py-12 shadow-sm">
              {previewForm.fieldMappings.length === 0 ? (
                <p className="text-center text-sm text-gray-400">
                  Add a field from the right panel to build this form.
                </p>
              ) : (
                <FormRenderer
                  form={previewForm}
                  slug={marketingForm.slug}
                  onSubmit={() => undefined}
                  submitted={false}
                  preview
                />
              )}
            </div>
          </div>

          <aside className="w-full shrink-0 border-l border-gray-200 bg-white p-4 lg:w-80">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 bg-blue-50">
                <TabsTrigger
                  value="fields"
                  className="data-[state=active]:bg-brand data-[state=active]:text-white"
                >
                  Fields
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-brand data-[state=active]:text-white"
                >
                  Form Settings
                </TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="pt-4">
                <FormFieldsPanel form={form} fields={boardFields} />
              </TabsContent>
              <TabsContent value="settings" className="pt-4">
                <FormSettingsPanel form={form} publicUrl={publicUrl} />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </div>
    </Form>
  );
};
