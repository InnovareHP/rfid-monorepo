import { PublicShell } from "@/components/public-shell";
import {
  getPublicForm,
  submitPublicForm,
} from "@/services/marketing/form-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FormRenderer } from "./form-renderer";

const FormCard = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-2xl rounded-[10px] bg-white px-6 py-10 shadow-lg sm:px-10 sm:py-12">
    {children}
  </div>
);

export const PublicFormPage = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [submitted, setSubmitted] = useState(false);

  const {
    data: form,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => getPublicForm(slug),
  });

  const onSubmit = async (values: Record<string, string>) => {
    try {
      const result = await submitPublicForm(slug, values);
      if (result.redirectUrl && /^https?:\/\//i.test(result.redirectUrl)) {
        window.location.href = result.redirectUrl;
        return;
      }
      setSubmitted(true);
    } catch {
      toast.error(
        "Something went wrong submitting this form. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <PublicShell>
        <FormCard>
          <div className="space-y-6">
            <Skeleton className="mx-auto h-7 w-56" />
            <div className="space-y-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mx-auto h-9 w-32" />
          </div>
        </FormCard>
      </PublicShell>
    );
  }

  if (isError || !form) {
    return (
      <PublicShell>
        <FormCard>
          <p className="text-center text-sm text-muted-foreground">
            This form is not available.
          </p>
        </FormCard>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <FormCard>
        <FormRenderer
          form={form}
          slug={slug}
          onSubmit={onSubmit}
          submitted={submitted}
        />
      </FormCard>
    </PublicShell>
  );
};
