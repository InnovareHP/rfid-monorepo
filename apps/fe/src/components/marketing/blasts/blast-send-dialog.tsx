import {
  getBlastAudienceCount,
  sendBlast,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { getCampaigns } from "@/services/marketing/campaign-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Mail, Send, Users } from "lucide-react";
import { toast } from "sonner";

type BlastSendDialogProps = {
  blast: MarketingBlast | null;
  onOpenChange: (open: boolean) => void;
  onSent?: (jobId: string) => void;
};

const messageOf = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ?? fallback;

export const BlastSendDialog = ({
  blast,
  onOpenChange,
  onSent,
}: BlastSendDialogProps) => {
  const queryClient = useQueryClient();

  // Errors here are the point, not a failure state: a blast with no groups or
  // an unverified sender says so through this query.
  const {
    data: audience,
    isLoading,
    error: audienceError,
  } = useQuery({
    queryKey: ["marketing-blast-audience-count", blast?.id],
    queryFn: () => getBlastAudienceCount(blast!.id),
    enabled: blast !== null,
    retry: false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: getCampaigns,
    enabled: blast !== null,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendBlast(blast!.id),
    onSuccess: ({ jobId }) => {
      toast.success("Blast send started");
      queryClient.invalidateQueries({ queryKey: ["marketing-blasts"] });
      queryClient.invalidateQueries({
        queryKey: ["marketing-blast", blast?.id],
      });
      onSent?.(jobId);
      onOpenChange(false);
    },
    onError: (error) => toast.error(messageOf(error, "Failed to send blast")),
  });

  const groupNames = blast?.groups.map((link) => link.group.name) ?? [];
  const sender = campaigns.find(
    (campaign) => campaign.id === blast?.campaignId
  )?.senderIdentity;

  const reachable = audience?.count ?? 0;
  const skipped = (audience?.total ?? 0) - reachable;
  const blocked = Boolean(audienceError) || reachable === 0;

  return (
    <Dialog open={blast !== null} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogFormHeader
          icon={<Send />}
          title="Send Blast"
          description="Sending cannot be undone or paused once it starts."
        />

        <div className="space-y-4 px-6 py-5">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : audienceError ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                {messageOf(audienceError, "This blast cannot be sent yet")}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-table-header p-4">
                <p className="text-2xl font-bold text-foreground">
                  {reachable.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {reachable === 1 ? "recipient" : "recipients"} will be emailed
                </p>
                {skipped > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-warning">
                    <AlertCircle className="size-3.5" />
                    {skipped.toLocaleString()} skipped for having no email
                    address
                  </p>
                )}
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-4" />
                    Groups
                  </dt>
                  <dd className="flex-1 text-right font-medium text-foreground">
                    {groupNames.join(", ") || "None"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="size-4" />
                    Sends from
                  </dt>
                  <dd className="flex-1 text-right font-medium text-foreground">
                    {/* No campaign sender means the connected mailbox chain. */}
                    {sender?.fromEmail ?? "Your connected mailbox"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </div>

        <DialogFormFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={isLoading || blocked || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            {sendMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {sendMutation.isPending
              ? "Starting..."
              : `Send to ${reachable.toLocaleString()}`}
          </Button>
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
};
