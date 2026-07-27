import CrmRecordCreate from "@/components/crm-list/crm-record-create";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/contacts/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const { team } = Route.useParams();
  const navigate = useNavigate();

  return (
    <CrmRecordCreate
      moduleType="CONTACT"
      title="Create Contacts"
      description="Add one or multiple contacts to your list"
      entityLabel="Contact"
      nameLabel="Contact Name"
      onBack={() => navigate({ to: "/$team/contacts", params: { team } })}
    />
  );
}
