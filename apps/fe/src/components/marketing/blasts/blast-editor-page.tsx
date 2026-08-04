import { authClient } from "@/lib/auth-client";
import {
  getBlast,
  getBlastAudienceCount,
  updateBlast,
  type AudienceFilter,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { getCampaigns } from "@/services/marketing/campaign-service";
import { isOrgAdmin } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { ArrowLeft, ChevronDown, Info, Loader2, Send } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { StatusPill } from "../../reusable-table/status-pill";
import { BlastAudienceFilter } from "./blast-audience-filter";
import {
  BLAST_STATUS_LABELS,
  BLAST_STATUS_TONES,
} from "./blast-list-table";
import { BlastSendDialog } from "./blast-send-dialog";
import { BlastSendProgress } from "./blast-send-progress";

const MODULE_TYPES = ["LEAD", "REFERRAL", "CONTACT", "COMPANY"] as const;
const NO_CAMPAIGN = "none";

const blastFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Body is required"),
  campaignId: z.string().optional(),
  moduleType: z.string().min(1),
});

type BlastFormValues = z.infer<typeof blastFormSchema>;

// Numbered, collapsible step used by the three editor sections.
function StepSection({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-4 border-b border-gray-200 bg-table-header px-6 py-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2C86D9] text-sm font-semibold text-white">
          {step}
        </span>
        <span className="flex-1 text-lg font-semibold text-gray-900">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "size-5 text-gray-500 transition-transform",
            !open && "-rotate-90"
          )}
        />
      </button>

      {open ? <div className="space-y-4 px-6 py-5">{children}</div> : null}
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-2.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="truncate text-right font-medium text-gray-900">
        {value}
      </span>
    </div>
  );
}

export const BlastEditorPage = () => {
  const { team, blastId } = useParams({ strict: false }) as {
    team: string;
    blastId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizationData } = authClient.useActiveOrganization();
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    organizationData?.id,
  ]);
  const isOwner = isOrgAdmin(memberData?.role);

  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({
    filter: {},
  });
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

  const { data: audience } = useQuery({
    queryKey: ["marketing-blast-audience-count", blastId],
    queryFn: () => getBlastAudienceCount(blastId),
    enabled: Boolean(blast),
  });

  const form = useForm<BlastFormValues>({
    resolver: zodResolver(blastFormSchema),
    values: blast
      ? {
          name: blast.name,
          subject: blast.subject,
          bodyHtml: blast.bodyHtml,
          campaignId: blast.campaignId ?? NO_CAMPAIGN,
          moduleType: blast.moduleType,
        }
      : undefined,
  });

  useEffect(() => {
    if (blast) setAudienceFilter(blast.audienceFilter);
  }, [blast]);

  const isDraft = blast?.status === "DRAFT";

  const saveMutation = useMutation({
    mutationFn: (values: BlastFormValues) =>
      updateBlast(blastId, {
        ...values,
        campaignId:
          values.campaignId === NO_CAMPAIGN ? null : values.campaignId,
        audienceFilter,
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

  if (isLoading || !blast) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  const campaignId = form.watch("campaignId");
  const moduleType = form.watch("moduleType") || blast.moduleType;
  const campaignName =
    campaigns.find((campaign) => campaign.id === campaignId)?.name ?? "None";
  const appliedFilterCount = Object.keys(audienceFilter.filter).length;
  const hasAudienceFilters =
    appliedFilterCount > 0 ||
    Boolean(audienceFilter.search) ||
    Boolean(audienceFilter.boardDateFrom) ||
    Boolean(audienceFilter.boardDateTo);

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to blasts"
            onClick={() =>
              navigate({ to: "/$team/marketing/blasts", params: { team } })
            }
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="page-title text-3xl font-bold tracking-tight">
            {blast.name}
          </h1>
          <StatusPill
            label={BLAST_STATUS_LABELS[blast.status]}
            tone={BLAST_STATUS_TONES[blast.status]}
          />
        </div>

        <div className="flex items-center gap-2">
          {isDraft && (
            <Button
              variant="outline"
              onClick={form.handleSubmit((values) =>
                saveMutation.mutate(values)
              )}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Save Draft
            </Button>
          )}
          {isDraft && isOwner && (
            <Button
              className="bg-brand text-white hover:bg-brand/90"
              onClick={() => setSendDialogBlast(blast)}
            >
              <Send className="size-4" />
              Send Blast
            </Button>
          )}
        </div>
      </div>

      {!isDraft && (
        <p className="text-sm text-muted-foreground">
          This blast is no longer a draft and can no longer be edited.
        </p>
      )}

      {activeJobId && <BlastSendProgress jobId={activeJobId} />}

      <StepSection step={1} title="Blast Details">
        <div className="space-y-2">
          <Label htmlFor="blast-name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="blast-name"
            placeholder="Internal name - recipients never see this."
            disabled={!isDraft}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="blast-subject">
            Subject <span className="text-red-500">*</span>
          </Label>
          <Input
            id="blast-subject"
            placeholder="Email Subject"
            disabled={!isDraft}
            {...form.register("subject")}
          />
          {form.formState.errors.subject && (
            <p className="text-sm text-destructive">
              {form.formState.errors.subject.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="blast-body">
            Body <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="blast-body"
            rows={8}
            disabled={!isDraft}
            {...form.register("bodyHtml")}
          />
          {form.formState.errors.bodyHtml && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bodyHtml.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Campaign</Label>
            <Select
              disabled={!isDraft}
              value={campaignId || NO_CAMPAIGN}
              onValueChange={(value) => form.setValue("campaignId", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CAMPAIGN}>None</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Module</Label>
            <Select
              disabled={!isDraft}
              value={moduleType}
              onValueChange={(value) => form.setValue("moduleType", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </StepSection>

      <StepSection step={2} title="Audience Filter">
        <BlastAudienceFilter
          moduleType={moduleType}
          audienceFilter={audienceFilter}
          onChange={setAudienceFilter}
        />
      </StepSection>

      <StepSection step={3} title="Review and Send">
        <div className="text-center">
          <p className="page-title text-5xl font-bold">{audience?.count ?? 0}</p>
          <p className="mt-1 text-base text-primary">Estimated Recipients</p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Message</h4>
          <div className="border-b border-gray-200" />
          <div className="divide-y divide-gray-200 rounded-lg bg-gray-50">
            <ReviewRow label="Name" value={form.watch("name")} />
            <ReviewRow label="Subject" value={form.watch("subject")} />
            <ReviewRow label="Body" value={form.watch("bodyHtml")} />
            <ReviewRow label="Campaign" value={campaignName} />
            <ReviewRow label="Module" value={moduleType} />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">
            Audience Filters Applied
          </h4>
          <div className="border-b border-gray-200" />
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-[#F4F9FF] p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm text-gray-700">
              {hasAudienceFilters
                ? `${appliedFilterCount} field filter${appliedFilterCount === 1 ? "" : "s"} applied${audienceFilter.search ? ", plus a search term" : ""}. Recipients are limited to matching ${moduleType.toLowerCase()} records.`
                : `No audience filters are applied - sending now will email everyone in the ${moduleType.toLowerCase()} module. Go back to Step 2 to narrow the audience if that is not intended.`}
            </p>
          </div>
        </div>
      </StepSection>

      <BlastSendDialog
        blast={sendDialogBlast}
        onOpenChange={(open) => {
          if (!open) setSendDialogBlast(null);
        }}
        onSent={(jobId) => setActiveJobId(jobId)}
      />
    </div>
  );
};
