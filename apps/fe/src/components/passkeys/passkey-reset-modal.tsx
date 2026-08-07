import { resetMemberPasskeys } from "@/services/passkeys/passkeys-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { useMutation } from "@tanstack/react-query";
import { Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PasskeyResetModalProps = {
  memberId: string | null;
  memberEmail: string | null;
  onClose: () => void;
};

export function PasskeyResetModal({
  memberId,
  memberEmail,
  onClose,
}: PasskeyResetModalProps) {
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: (id: string) => resetMemberPasskeys(id),
    onSuccess: (grant) => setRecoveryCode(grant.code),
    onError: () => toast.error("Could not reset this member's passkeys."),
  });

  const close = () => {
    setRecoveryCode(null);
    onClose();
  };

  return (
    <Dialog open={memberId !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset passkeys</DialogTitle>
          <DialogDescription>
            {recoveryCode
              ? "Give this code to the member directly. It is shown once and is never emailed."
              : `This removes every passkey on ${memberEmail ?? "this member"} and issues a one-time recovery code valid for 24 hours.`}
          </DialogDescription>
        </DialogHeader>

        {recoveryCode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-2 text-xs">
                {recoveryCode}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(recoveryCode);
                  toast.success("Recovery code copied.");
                }}
                aria-label="Copy recovery code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone holding this code can register a passkey on that account.
              Hand it over in person or by voice, not by email.
            </p>
            <Button className="w-full" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={resetMutation.isPending || !memberId}
              onClick={() => memberId && resetMutation.mutate(memberId)}
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reset passkeys"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
