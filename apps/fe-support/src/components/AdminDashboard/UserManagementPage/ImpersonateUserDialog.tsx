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
import { Button } from "@dashboard/ui/components/button";
import { Label } from "@dashboard/ui/components/label";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useState } from "react";

const MIN_REASON_LENGTH = 10;

type ImpersonateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
};

export function ImpersonateUserDialog({
  open,
  onOpenChange,
  userName,
  isPending,
  onConfirm,
}: ImpersonateUserDialogProps) {
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < MIN_REASON_LENGTH;

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Impersonate user?</AlertDialogTitle>
          <AlertDialogDescription>
            You will act as <strong>{userName}</strong> and can see the patient
            data their organization holds. The reason below is written to the
            admin activity log with your name.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="impersonation-reason">Reason</Label>
          <Textarea
            id="impersonation-reason"
            placeholder="e.g. Ticket 1423 — reproducing the referral export error"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            At least {MIN_REASON_LENGTH} characters.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button disabled={isPending || tooShort} onClick={handleConfirm}>
              {isPending ? "Starting..." : "Impersonate"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
