import {
  getBlastAudienceCount,
  sendBlast,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dashboard/ui/components/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type BlastSendDialogProps = {
  blast: MarketingBlast | null;
  onOpenChange: (open: boolean) => void;
  onSent?: (jobId: string) => void;
};

export const BlastSendDialog = ({
  blast,
  onOpenChange,
  onSent,
}: BlastSendDialogProps) => {
  const queryClient = useQueryClient();

  const { data: audience, isLoading } = useQuery({
    queryKey: ["marketing-blast-audience-count", blast?.id],
    queryFn: () => getBlastAudienceCount(blast!.id),
    enabled: blast !== null,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendBlast(blast!.id),
    onSuccess: ({ jobId }) => {
      toast.success("Blast send started");
      queryClient.invalidateQueries({ queryKey: ["marketing-blasts"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-blast", blast?.id] });
      onSent?.(jobId);
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to send blast"),
  });

  return (
    <AlertDialog open={blast !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send blast</AlertDialogTitle>
          <AlertDialogDescription>
            {isLoading
              ? "Calculating audience size..."
              : `This will email ${audience?.count ?? 0} recipient${audience?.count === 1 ? "" : "s"}. Continue?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sendMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading || sendMutation.isPending || !audience?.count}
            onClick={(event) => {
              event.preventDefault();
              sendMutation.mutate();
            }}
          >
            Send
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
