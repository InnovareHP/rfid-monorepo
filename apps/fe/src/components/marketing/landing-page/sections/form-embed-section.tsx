import { FormRenderer } from "@/components/marketing/forms/form-renderer";
import { submitPublicForm } from "@/services/marketing/form-service";
import type {
  FormEmbedSection as FormEmbedSectionType,
  PublicEmbeddedForm,
} from "@/services/marketing/landing-page-service";
import { useState } from "react";
import { toast } from "sonner";

type FormEmbedSectionProps = {
  section: FormEmbedSectionType;
  embeddedForm: PublicEmbeddedForm | null;
};

export const FormEmbedSection = ({
  section,
  embeddedForm,
}: FormEmbedSectionProps) => {
  const [submitted, setSubmitted] = useState(false);

  // formId can be missing/unpublished (e.g. deleted after the page was
  // published) — degrade gracefully instead of a blank space or a crash.
  if (!embeddedForm) {
    return (
      <section className="py-10 px-6 text-center text-sm text-gray-400">
        This form is no longer available.
      </section>
    );
  }

  const onSubmit = async (values: Record<string, string>) => {
    try {
      const result = await submitPublicForm(embeddedForm.slug, values);
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

  return (
    <section className="py-10 px-6 max-w-md mx-auto space-y-4">
      {section.props.heading && (
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          {section.props.heading}
        </h2>
      )}
      <FormRenderer
        form={embeddedForm}
        onSubmit={onSubmit}
        submitted={submitted}
      />
    </section>
  );
};
