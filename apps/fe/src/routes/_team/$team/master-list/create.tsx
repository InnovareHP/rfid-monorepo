import RecordCreatePage, {
  type CreatedRecord,
  type RecordColumn,
} from "@/components/record-create/record-create-page";
import {
  createLead,
  getDropdownOptions,
  getLeadColumnOptions,
} from "@/services/lead/lead-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_team/$team/master-list/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const { team } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: columnsData, isLoading: isLoadingColumns } = useQuery({
    queryKey: ["lead-columns"],
    queryFn: () => getLeadColumnOptions(),
  });

  const columns: RecordColumn[] = columnsData || [];

  const goBack = () => navigate({ to: "/$team/master-list", params: { team } });

  const createFacilitiesMutation = useMutation({
    mutationFn: async (records: CreatedRecord[]) => {
      for (const record of records) {
        await createLead([{ recordName: record.recordName }], "LEAD", {
          initialValues: record.values,
        });
      }
    },
    onSuccess: () => {
      toast.success("Facilities created successfully");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      goBack();
    },
    onError: () => {
      toast.error("Failed to create facilities");
    },
  });

  return (
    <RecordCreatePage
      title="Create Facilities"
      description="Add one or multiple facilities to your master list"
      entityLabel="Facility"
      nameLabel="Facility Name"
      columns={columns}
      isLoadingColumns={isLoadingColumns}
      isSubmitting={createFacilitiesMutation.isPending}
      fetchDropdownOptions={getDropdownOptions}
      onSubmit={(records) => createFacilitiesMutation.mutate(records)}
      onBack={goBack}
    />
  );
}
