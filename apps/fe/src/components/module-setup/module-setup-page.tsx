import { PageHeader } from "@/components/page-header";
import { useModuleGroups } from "@/hooks/use-module-groups";
import { MODULES_KEY } from "@/hooks/use-modules";
import { NAV_KEY } from "@/hooks/use-nav-data";
import { createModule } from "@/services/module/module-service";
import { Button } from "@dashboard/ui/components/button";
import { Form } from "@dashboard/ui/components/form";
import { Spinner } from "@dashboard/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ModuleColumnsStep } from "./module-columns-step";
import { ModuleIdentityStep } from "./module-identity-step";
import { ModuleReviewStep } from "./module-review-step";
import type { ModuleFormValues } from "./module-setup-schema";
import {
  MODULE_STEPS,
  moduleSetupSchema,
  templateFields,
} from "./module-setup-schema";
import { ModuleStepRail } from "./module-step-rail";

export default function ModuleSetupPage() {
  const { team } = useParams({ strict: false }) as { team: string };
  const { group } = useSearch({ from: "/_team/$team/records/new" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState<string | null>("CUSTOM");

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSetupSchema),
    defaultValues: {
      label: "",
      labelSingular: "",
      icon: "Table2",
      groupId: group ?? "",
      fields: templateFields("CUSTOM"),
    },
  });

  // Folders are their own rows now, so the step picks one instead of typing a
  // name that a typo could split in two.
  const { data: groups = [] } = useModuleGroups();

  const fieldArray = useFieldArray({ control: form.control, name: "fields" });
  const label = form.watch("label");
  const labelSingular = form.watch("labelSingular");
  const icon = form.watch("icon");
  const watchedFields = form.watch("fields");

  // The field array owns the stable ids and the watch owns the live values, so
  // the steps get them zipped rather than keying anything on an index.
  const columns = fieldArray.fields.map((row, index) => ({
    ...(watchedFields[index] ?? row),
    id: row.id,
  }));

  const createMutation = useMutation({
    mutationFn: (values: ModuleFormValues) =>
      createModule({ ...values, groupId: values.groupId || undefined }),
    onSuccess: (created) => {
      toast.success(`${created.label} created`);
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
      queryClient.invalidateQueries({ queryKey: NAV_KEY });
      navigate({
        to: "/$team/records/$moduleKey",
        params: { team, moduleKey: created.key },
      });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create module";
      toast.error(message);
    },
  });

  const goNext = async () => {
    const valid = await form.trigger(
      step === 0 ? ["label", "labelSingular", "icon"] : ["fields"]
    );

    if (valid) setStep(step + 1);
  };

  const applyTemplate = (value: string) => {
    setTemplate(value);
    fieldArray.replace(templateFields(value));
  };

  const isLastStep = step === MODULE_STEPS.length - 1;

  return (
    <div className="page-style">
      <PageHeader
        title="New Module"
        description="Create a record type of your own, with its own columns and board."
      />

      <div className="max-w-2xl space-y-6">
        <ModuleStepRail step={step} onStepChange={setStep} />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate(values)
            )}
            className="space-y-6"
          >
            {step === 0 && (
              <ModuleIdentityStep form={form} label={label} groups={groups} />
            )}

            {step === 1 && (
              <ModuleColumnsStep
                form={form}
                fieldArray={fieldArray}
                columns={columns}
                template={template}
                onTemplateChange={applyTemplate}
                labelSingular={labelSingular}
              />
            )}

            {step === 2 && (
              <ModuleReviewStep
                label={label}
                labelSingular={labelSingular}
                icon={icon}
                columns={columns}
              />
            )}

            <div className="flex gap-2 border-t border-border pt-4">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}

              {isLastStep ? (
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Spinner className="size-4" />}
                  Create module
                </Button>
              ) : (
                <Button type="button" onClick={goNext}>
                  Continue
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
