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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useState } from "react";

type BanUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  isPending: boolean;
  onConfirm: (reason: string, expiresIn?: number) => void;
};

const BAN_DURATION_OPTIONS = [
  { label: "Permanent", value: "permanent" },
  { label: "1 hour", value: String(60 * 60) },
  { label: "24 hours", value: String(24 * 60 * 60) },
  { label: "7 days", value: String(7 * 24 * 60 * 60) },
  { label: "30 days", value: String(30 * 24 * 60 * 60) },
];

export function BanUserDialog({
  open,
  onOpenChange,
  userName,
  isPending,
  onConfirm,
}: BanUserDialogProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");

  const handleConfirm = () => {
    const expiresIn = duration === "permanent" ? undefined : Number(duration);
    onConfirm(reason, expiresIn);
    setReason("");
    setDuration("permanent");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ban user?</AlertDialogTitle>
          <AlertDialogDescription>
            This will ban <strong>{userName}</strong> from accessing the
            platform. They will not be able to sign in until unbanned.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Textarea
              id="ban-reason"
              placeholder="Why is this user being banned?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ban-duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="ban-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAN_DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending ? "Banning..." : "Ban user"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
