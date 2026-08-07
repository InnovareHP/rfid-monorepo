import { authClient } from "@/lib/auth-client";
import {
  getBlast,
  getBlastAudienceCount,
  updateBlast,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { getCampaigns } from "@/services/marketing/campaign-service";
import { getGroups } from "@/services/marketing/group-service";
import { can } from "@/lib/permissions";
import { Button } from "@dashboard/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
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
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { StatusPill } from "../../reusable-table/status-pill";
import { BlastGroupPicker } from "./blast-group-picker";
import { BLAST_STATUS_LABELS, BLAST_STATUS_TONES } from "./blast-list-table";
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
  groupIds: z.array(z.string()).min(1, "Pick at least one group"),
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
  const canSend = can(memberData?.role, { outreach: ["send"] });

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
          groupIds: blast.groups.map((link) => link.group.id),
        }
      : undefined,
  });

  const isDraft = blast?.status === "DRAFT";

  const saveMutation = useMutation({
    mutationFn: (values: BlastFormValues) =>
      updateBlast(blastId, {
        ...values,
        campaignId:
          values.campaignId === NO_CAMPAIGN ? null : values.campaignId,
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
  const selectedGroupIds = form.watch("groupIds") ?? [];
  const selectedGroupNames = groups
    .filter((group) => selectedGroupIds.includes(group.id))
    .map((group) => group.name);

  return (
    <Form {...form}>
      <div className="page-style">
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
            {isDraft && canSend && (
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Internal name - recipients never see this."
                    disabled={!isDraft}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Subject <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Email Subject"
                    disabled={!isDraft}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bodyHtml"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Body <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea rows={8} disabled={!isDraft} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="campaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign</FormLabel>
                  <Select
                    disabled={!isDraft}
                    value={field.value || NO_CAMPAIGN}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CAMPAIGN}>None</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select
                    disabled={!isDraft}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODULE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </StepSection>

        <StepSection step={2} title="Recipient Groups">
          <FormField
            control={form.control}
            name="groupIds"
            render={({ field }) => (
              <FormItem>
                <BlastGroupPicker
                  moduleType={moduleType}
                  value={field.value ?? []}
                  disabled={!isDraft}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </StepSection>

        <StepSection step={3} title="Review and Send">
          <div className="text-center">
            <p className="page-title text-5xl font-bold">
              {audience?.count ?? 0}
            </p>
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
              <ReviewRow
                label="Groups"
                value={selectedGroupNames.join(", ") || "None"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">
              Groups Selected
            </h4>
            <div className="border-b border-gray-200" />
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-[#F4F9FF] p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-sm text-gray-700">
                {selectedGroupNames.length
                  ? `Sending to ${selectedGroupNames.join(", ")}. Records in more than one group are emailed once.`
                  : "No groups are selected. Pick at least one in Step 2, then save the draft."}
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
    </Form>
  );
};
