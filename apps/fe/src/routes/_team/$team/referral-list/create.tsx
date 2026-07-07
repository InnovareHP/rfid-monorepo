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
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      goBack();
    },
    onError: () => {
      toast.error("Failed to create referrals");
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
      description="Add one or multiple referrals to your list"
      entityLabel="Referral"
      nameLabel="Referral Name"
      columns={columns}
      isLoadingColumns={isLoadingColumns}
      isSubmitting={createReferralMutation.isPending}
      fetchDropdownOptions={getReferralDropdownOptions}
      onSubmit={handleSubmit}
      onBack={goBack}
    />
  );
}
