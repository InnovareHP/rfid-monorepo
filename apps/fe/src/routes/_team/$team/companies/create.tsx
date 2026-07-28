import CrmRecordCreate from "@/components/crm-list/crm-record-create";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/companies/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const { team } = Route.useParams();
  const navigate = useNavigate();

  return (
    <CrmRecordCreate
      moduleType="COMPANY"
      title="Create Companies"
      description="Add one or multiple companies to your list"
      entityLabel="Company"
      nameLabel="Company Name"
      onBack={() => navigate({ to: "/$team/companies", params: { team } })}
    />
  );
}
