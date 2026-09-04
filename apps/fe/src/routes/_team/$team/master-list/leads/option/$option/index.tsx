import FieldOptionPage from "@/components/field-option/field-option-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/master-list/leads/option/$option/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { option } = Route.useParams();

  return <FieldOptionPage fieldKey={option} />;
}
