import { authClient } from "@/lib/auth-client";
import { getCampaigns } from "@/services/marketing/campaign-service";
import {
  getBlast,
  updateBlast,
  type AudienceFilter,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { isOrgAdmin } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type { Member } from "better-auth/plugins/organization";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BlastAudienceFilter } from "./blast-audience-filter";
import { BlastSendDialog } from "./blast-send-dialog";
import { BlastSendProgress } from "./blast-send-progress";

const MODULE_TYPES = ["LEAD", "REFERRAL", "CONTACT", "COMPANY"] as const;

const blastFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Body is required"),
  campaignId: z.string().optional(),
  moduleType: z.string().min(1),
});

type BlastFormValues = z.infer<typeof blastFormSchema>;

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

  const form = useForm<BlastFormValues>({
    resolver: zodResolver(blastFormSchema),
    values: blast
      ? {
          name: blast.name,
          subject: blast.subject,
          bodyHtml: blast.bodyHtml,
          campaignId: blast.campaignId ?? undefined,
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
      updateBlast(blastId, { ...values, audienceFilter }),
    onSuccess: () => {
      toast.success("Blast saved");
      queryClient.invalidateQueries({ queryKey: ["marketing-blast", blastId] });
      queryClient.invalidateQueries({ queryKey: ["marketing-blasts"] });
    },
    onError: () => toast.error("Failed to save blast"),
  });

  if (isLoading || !blast) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({ to: "/$team/marketing/blasts", params: { team } })
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              {blast.name}
            </h1>
            <Badge variant={isDraft ? "outline" : "default"}>
              {blast.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isDraft && isOwner && (
              <Button variant="outline" onClick={() => setSendDialogBlast(blast)}>
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            )}
            {isDraft && (
              <Button
                onClick={form.handleSubmit((values) =>
                  saveMutation.mutate(values)
                )}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save
              </Button>
            )}
          </div>
        </div>

        {!isDraft && (
          <p className="text-sm text-gray-500">
            This blast is no longer a draft and can no longer be edited.
          </p>
        )}

        {activeJobId && <BlastSendProgress jobId={activeJobId} />}

        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="space-y-1.5">
            <Label htmlFor="blast-name">Name</Label>
            <Input
              id="blast-name"
              disabled={!isDraft}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="blast-subject">Subject</Label>
            <Input
              id="blast-subject"
              disabled={!isDraft}
              {...form.register("subject")}
            />
            {form.formState.errors.subject && (
              <p className="text-sm text-destructive">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="blast-body">Body</Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Campaign</Label>
              <Select
                disabled={!isDraft}
                value={form.watch("campaignId") || undefined}
                onValueChange={(value) => form.setValue("campaignId", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select
                disabled={!isDraft}
                value={form.watch("moduleType")}
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
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700">Audience</h3>
          <BlastAudienceFilter
            moduleType={form.watch("moduleType") || blast.moduleType}
            audienceFilter={audienceFilter}
            onChange={setAudienceFilter}
          />
        </div>
      </div>

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
