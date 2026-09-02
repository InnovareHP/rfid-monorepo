import { WriteGate } from "@/components/write-gate";
import {
  getBlastAudienceCount,
  sendTestBlast,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { Button } from "@dashboard/ui/components/button";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Info, Send, TestTube, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BlastEmailPreview } from "./blast-email-preview";
import type { BlastBlock } from "./blast-block-schema";
import { BlastReviewRow } from "./blast-review-row";
import { BlastReviewSection } from "./blast-review-section";

type BlastReviewSendProps = {
  blast: MarketingBlast;
  blocks: BlastBlock[];
  bodyHtml: string;
  campaignName: string;
  groupNames: string[];
  testEmail: string;
  canSend: boolean;
  onBack: () => void;
  onSend: () => void;
  isSending: boolean;
};

export const BlastReviewSend = ({
  blast,
  blocks,
  bodyHtml,
  campaignName,
  groupNames,
  testEmail,
  canSend,
  onBack,
  onSend,
  isSending,
}: BlastReviewSendProps) => {
  const { data: audience, isLoading } = useQuery({
    queryKey: ["marketing-blast-audience-count", blast.id],
    queryFn: () => getBlastAudienceCount(blast.id),
    retry: false,
  });

  const testMutation = useMutation({
    mutationFn: () => sendTestBlast(blast.id, testEmail),
    onSuccess: () => toast.success(`Test email sent to ${testEmail}`),
    onError: () => toast.error("Failed to send test email"),
  });

  return (
    <div className="space-y-6 rounded-3xl bg-card p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-rail-via">
          <Send className="size-7 text-brand-rail-foreground" />
        </span>
        <div>
          <h1 className="page-title text-4xl font-semibold">Review and Send</h1>
          <p className="text-base text-foreground">
            Review the email details and content before sending.
          </p>
        </div>
      </div>

      <BlastReviewSection title="Blast Details">
        <div className="divide-y divide-border rounded-2xl bg-muted px-4">
          <BlastReviewRow label="Name" value={blast.name} />
          <BlastReviewRow label="Subject" value={blast.subject} />
          <BlastReviewRow label="Campaign" value={campaignName} />
        </div>
      </BlastReviewSection>

      <BlastReviewSection title="Body">
        <div className="overflow-hidden rounded-md border border-border shadow-sm">
          {blast.editorType === "CLASSIC" ? (
            // Already sanitized on the way in and again by the API on save.
            <div
              className="bg-card p-6 text-sm text-foreground"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <BlastEmailPreview blocks={blocks} />
          )}
        </div>
      </BlastReviewSection>

      <BlastReviewSection title="Recipients">
        {isLoading ? (
          <Skeleton className="mx-auto h-24 w-48" />
        ) : (
          <div className="text-center">
            <p className="page-title text-6xl font-bold">
              {(audience?.count ?? 0).toLocaleString()}
            </p>
            <p className="text-2xl text-primary">Estimated Recipients</p>
          </div>
        )}
      </BlastReviewSection>

      <div className="flex items-start gap-3 rounded-lg border border-info/40 bg-table-header px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs text-foreground">
          {groupNames.length
            ? `Sending to ${groupNames.join(", ")}. Records in more than one group are emailed once.`
            : "No groups are selected. Pick at least one before sending."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Go Back to Editor
        </Button>

        <div className="flex items-center gap-2">
          <WriteGate>
          <Button
            type="button"
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <TestTube className="size-4" />
            )}
            Send Test Email
          </Button>
          </WriteGate>

          {canSend && (
            <WriteGate>
              <Button type="button" disabled={isSending} onClick={onSend}>
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send Blast
              </Button>
            </WriteGate>
          )}
        </div>
      </div>
    </div>
  );
};
