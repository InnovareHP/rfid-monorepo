import { getApiErrorMessage } from "@/lib/helper/helper";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { FACILITY_FORM_SECTIONS } from "@/components/master-list/facility-form-sections";
import { DuplicateWarningDialog } from "@/components/record-create/duplicate-warning-dialog";
import { useDuplicateCheck } from "@/hooks/use-duplicate-check";
import RecordCreatePage, {
  type CreatedRecord,
  type RecordColumn,
} from "@/components/record-create/record-create-page";
import {
  createLead,
  getLeadColumnOptions,
} from "@/services/lead/lead-service";
import { getFieldOptions } from "@/services/options/options-service";
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
      queryClient.invalidateQueries({ queryKey: boardQueryKey("LEAD") });
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });
      goBack();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create facilities"));
    },
  });

  const duplicateCheck = useDuplicateCheck({
    moduleType: "LEAD",
    columns,
    onCreate: (records) => createFacilitiesMutation.mutate(records),
  });

  return (
    <>
      <RecordCreatePage
        title="Create Facilities"
        description="Add one or multiple facilities to your master list."
        entityLabel="Facility"
        entityLabelPlural="Facilities"
        nameLabel="Facility Name"
        columns={columns}
        sections={FACILITY_FORM_SECTIONS}
        isLoadingColumns={isLoadingColumns}
        isSubmitting={
          createFacilitiesMutation.isPending || duplicateCheck.isChecking
        }
        fetchDropdownOptions={(fieldId, search, limit) =>
          getFieldOptions(fieldId, 1, limit, search)
        }
        optionModule="LEAD"
        onSubmit={duplicateCheck.submit}
        onBack={goBack}
      />

      <DuplicateWarningDialog
        findings={duplicateCheck.findings}
        entityLabel="Facility"
        onCancel={duplicateCheck.dismiss}
        onCreateAnyway={duplicateCheck.createAnyway}
      />
    </>
  );
}
