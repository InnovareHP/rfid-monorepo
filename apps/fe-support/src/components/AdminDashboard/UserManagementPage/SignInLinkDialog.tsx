import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dashboard/ui/components/alert-dialog";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Textarea } from "@dashboard/ui/components/textarea";
import type { SignInLink } from "@/services/admin/admin-service";
import { toast } from "sonner";
import { useState } from "react";

const MIN_REASON_LENGTH = 10;

type SignInLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  isPending: boolean;
  link: SignInLink | null;
  onConfirm: (reason: string) => void;
};

export function SignInLinkDialog({
  open,
  onOpenChange,
  userName,
  isPending,
  link,
  onConfirm,
}: SignInLinkDialogProps) {
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < MIN_REASON_LENGTH;

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    toast.success("Link copied");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate a sign-in link?</AlertDialogTitle>
          <AlertDialogDescription>
            Anyone who opens this link is signed in as{" "}
            <strong>{userName}</strong>. Send it only to the account holder, on a
            channel where you have already identified them. It expires in 10
            minutes, works once, and the reason below goes to the admin activity
            log with your name.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {link ? (
          <div className="space-y-2 py-2">
            <Label htmlFor="sign-in-link">Link</Label>
            <Input id="sign-in-link" readOnly value={link.url} />
            <p className="text-xs text-muted-foreground">
              Expires {new Date(link.expiresAt).toLocaleTimeString()}. Shown
              once: close this and you have to issue a new one.
            </p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            <Label htmlFor="sign-in-link-reason">Reason</Label>
            <Textarea
              id="sign-in-link-reason"
              placeholder="e.g. Ticket 1423 — lost passkey, identity confirmed on call"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              At least {MIN_REASON_LENGTH} characters.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{link ? "Done" : "Cancel"}</AlertDialogCancel>
          {link ? (
            <Button onClick={copy}>Copy link</Button>
          ) : (
            <Button
              disabled={isPending || tooShort}
              onClick={() => onConfirm(reason.trim())}
            >
              {isPending ? "Generating..." : "Generate"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
