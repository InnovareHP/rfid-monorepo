import { PublicFormPage } from "@/components/marketing/forms/public-form-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/f/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PublicFormPage />;
}
