import {
  getPublicForm,
  submitPublicForm,
} from "@/services/marketing/form-service";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FormRenderer } from "./form-renderer";

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
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        This form is not available.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 p-6">
        <FormRenderer form={form} onSubmit={onSubmit} submitted={submitted} />
      </div>
    </div>
  );
};
