import { StepFormPageSkeleton } from "@/components/skeletons/builder-page-skeleton";
import { can } from "@/lib/permissions";
import {
  getBlast,
  updateBlast,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { getCampaigns } from "@/services/marketing/campaign-service";
import { getGroups } from "@/services/marketing/group-service";
import { Form } from "@dashboard/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { blastFormSchema, type BlastFormValues } from "./blast-block-schema";
import { BlastClassicEditor } from "./blast-classic-editor";
import { BlastDragDropEditor } from "./blast-drag-drop-editor";
import { BlastEditorHeader } from "./blast-editor-header";
import { BlastReviewSend } from "./blast-review-send";
import { BlastSendDialog } from "./blast-send-dialog";
import { BlastSendProgress } from "./blast-send-progress";
import { NO_CAMPAIGN } from "./blast-settings-panel";

export const BlastEditorPage = () => {
  const { team, blastId } = useParams({ strict: false }) as {
    team: string;
    blastId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The org id already rides in the route context, so this avoids a per-mount
  // auth fetch and the undefined first render that flickered role-gated UI.
  const { activeOrganizationId, user } = useRouteContext({
    from: "__root__",
  }) as {
    activeOrganizationId: string;
    user: { email: string } | null;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canSend = can(memberData?.role, { outreach: ["send"] });

  const [reviewing, setReviewing] = useState(false);
  const [sendDialogBlast, setSendDialogBlast] = useState<MarketingBlast | null>(
    null
  );
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: blast, isLoading } = useQuery({
    queryKey: ["marketing-blast", blastId],
    queryFn: () => getBlast(blastId),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: getCampaigns,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["marketing-groups"],
    queryFn: getGroups,
  });

  const form = useForm<BlastFormValues>({
    resolver: zodResolver(blastFormSchema),
    values: blast
      ? {
          name: blast.name,
          subject: blast.subject,
          campaignId: blast.campaignId ?? NO_CAMPAIGN,
          groupIds: blast.groups.map((link) => link.group.id),
          bodyHtml: blast.bodyHtml,
          blocks: blast.bodyJson ?? [],
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (values: BlastFormValues) =>
      updateBlast(blastId, {
        name: values.name,
        subject: values.subject,
        campaignId:
          values.campaignId === NO_CAMPAIGN ? null : values.campaignId,
        groupIds: values.groupIds,
        // The server keeps whichever half matches the blast's editor type.
        bodyHtml: values.bodyHtml,
        blocks: values.blocks,
      }),
    onSuccess: () => {
      toast.success("Blast saved");
      queryClient.invalidateQueries({ queryKey: ["marketing-blast", blastId] });
      queryClient.invalidateQueries({ queryKey: ["marketing-blasts"] });
      queryClient.invalidateQueries({
        queryKey: ["marketing-blast-audience-count", blastId],
      });
    },
    onError: () => toast.error("Failed to save blast"),
  });

  // Watched rather than read once, so the header and the review screen track
  // what is currently in the form.
  const values = useWatch({ control: form.control });

  if (isLoading || !blast) {
    return <StepFormPageSkeleton />;
  }

  const isDraft = blast.status === "DRAFT";
  const campaignName =
    campaigns.find((campaign) => campaign.id === values.campaignId)?.name ??
    "None";
  const groupNames = groups
    .filter((group) => (values.groupIds ?? []).includes(group.id))
    .map((group) => group.name);

  // Review reads the saved blast, so the draft is written before it opens.
  const handlePreview = form.handleSubmit(async (submitted) => {
    await saveMutation.mutateAsync(submitted);
    setReviewing(true);
  });

  return (
    <Form {...form}>
      <div className="page-style">
        <BlastEditorHeader
          blast={blast}
          title={values.name || blast.name}
          isDraft={isDraft}
          isSaving={saveMutation.isPending}
          onBack={() =>
            navigate({ to: "/$team/marketing/blasts", params: { team } })
          }
          onSave={form.handleSubmit((submitted) =>
            saveMutation.mutate(submitted)
          )}
          onPreview={handlePreview}
        />

        {!isDraft && (
          <p className="text-sm text-muted-foreground">
            This blast is no longer a draft and can no longer be edited.
          </p>
        )}

        {activeJobId && <BlastSendProgress jobId={activeJobId} />}

        {reviewing ? (
          <BlastReviewSend
            blast={blast}
            blocks={blast.bodyJson ?? []}
            bodyHtml={blast.bodyHtml}
            campaignName={campaignName}
            groupNames={groupNames}
            testEmail={user?.email ?? ""}
            canSend={canSend && isDraft}
            isSending={sendDialogBlast !== null}
            onBack={() => setReviewing(false)}
            onSend={() => setSendDialogBlast(blast)}
          />
        ) : blast.editorType === "DRAG_DROP" ? (
          <BlastDragDropEditor
            form={form}
            campaigns={campaigns}
            disabled={!isDraft}
          />
        ) : (
          <BlastClassicEditor
            form={form}
            campaigns={campaigns}
            disabled={!isDraft}
          />
        )}

        <BlastSendDialog
          blast={sendDialogBlast}
          onOpenChange={(open) => {
            if (!open) setSendDialogBlast(null);
          }}
          onSent={(jobId) => {
            setActiveJobId(jobId);
            setReviewing(false);
          }}
        />
      </div>
    </Form>
  );
};
