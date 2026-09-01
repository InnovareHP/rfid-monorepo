import { getApiErrorMessage } from "@/lib/helper/helper";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { REFERRAL_FORM_SECTIONS } from "@/components/referral-list/referral-form-sections";
import RecordCreatePage, {
  type CreatedRecord,
  type RecordColumn,
} from "@/components/record-create/record-create-page";
import {
  createReferral,
  getReferralColumnOptions,
  getReferralDropdownOptions,
} from "@/services/referral/referral-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_team/$team/referral-list/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const { team } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: columnsData, isLoading: isLoadingColumns } = useQuery({
    queryKey: ["referral-columns"],
    queryFn: () => getReferralColumnOptions(),
  });

  const columns: RecordColumn[] = columnsData || [];

  const goBack = () =>
    navigate({ to: "/$team/referral-list", params: { team } });

  const createReferralMutation = useMutation({
    mutationFn: createReferral,
    onSuccess: () => {
      toast.success("Referrals created successfully");
      queryClient.invalidateQueries({ queryKey: boardQueryKey("REFERRAL") });
      queryClient.invalidateQueries({
        queryKey: ["referral-pipeline-analytics"],
      });
      goBack();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create referrals"));
    },
  });

  const handleSubmit = (records: CreatedRecord[]) => {
    const referralData = records.map((record) => {
      const payload: Record<string, string> = {
        referral_name: record.recordName,
      };
      columns.forEach((col) => {
        payload[col.name] = record.values[col.id] ?? "";
      });
      return payload;
    });

    createReferralMutation.mutate(referralData);
  };

  return (
    <RecordCreatePage
      title="Create Referrals"
      description="Add one or multiple referrals to your list. Fields marked * are required to keep pipeline and outreach reporting accurate."
      entityLabel="Referral"
      entityLabelPlural="Referrals"
      nameLabel="Referral Liaison"
      columns={columns}
      sections={REFERRAL_FORM_SECTIONS}
      isLoadingColumns={isLoadingColumns}
      isSubmitting={createReferralMutation.isPending}
      fetchDropdownOptions={(fieldId, search, limit) =>
        getReferralDropdownOptions(fieldId, 1, limit, search)
      }
      optionModule="REFERRAL"
      onSubmit={handleSubmit}
      onBack={goBack}
    />
  );
}
