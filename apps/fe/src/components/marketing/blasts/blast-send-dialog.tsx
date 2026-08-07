import {
  getBlastAudienceCount,
  sendBlast,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { getCampaigns } from "@/services/marketing/campaign-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dashboard/ui/components/alert-dialog";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Mail, Users } from "lucide-react";
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
    onError: (error) =>
      toast.error(messageOf(error, "Failed to send blast")),
  });

  const groupNames = blast?.groups.map((link) => link.group.name) ?? [];
  const sender = campaigns.find(
    (campaign) => campaign.id === blast?.campaignId
  )?.senderIdentity;

  const reachable = audience?.count ?? 0;
  const skipped = (audience?.total ?? 0) - reachable;
  const blocked = Boolean(audienceError) || reachable === 0;

  return (
    <AlertDialog open={blast !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send blast</AlertDialogTitle>
        </AlertDialogHeader>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : audienceError ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">
              {messageOf(audienceError, "This blast cannot be sent yet")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-200 bg-[#F4F9FF] p-4">
              <p className="text-2xl font-bold text-gray-900">
                {reachable.toLocaleString()}
              </p>
              <p className="text-sm text-gray-700">
                {reachable === 1 ? "recipient" : "recipients"} will be emailed
              </p>
              {skipped > 0 && (
                <p className="mt-1 flex items-center gap-1 text-sm text-amber-700">
                  <AlertCircle className="size-3.5" />
                  {skipped.toLocaleString()} skipped for having no email address
                </p>
              )}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-4" />
                  Groups
                </dt>
                <dd className="flex-1 text-right font-medium text-gray-900">
                  {groupNames.join(", ") || "None"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-4" />
                  Sends from
                </dt>
                <dd className="flex-1 text-right font-medium text-gray-900">
                  {/* No campaign sender means the connected mailbox chain. */}
                  {sender?.fromEmail ?? "Your connected mailbox"}
                </dd>
              </div>
            </dl>

            <p className="text-sm text-muted-foreground">
              Sending cannot be undone or paused once it starts.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={sendMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading || blocked || sendMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              sendMutation.mutate();
            }}
          >
            {sendMutation.isPending
              ? "Starting..."
              : `Send to ${reachable.toLocaleString()}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
