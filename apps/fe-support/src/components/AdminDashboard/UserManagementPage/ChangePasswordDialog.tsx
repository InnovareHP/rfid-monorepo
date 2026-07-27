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
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  isPending: boolean;
  onConfirm: (newPassword: string) => void;
};

const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordDialog({
  open,
  onOpenChange,
  userName,
  isPending,
  onConfirm,
}: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const tooShort =
    newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    !isPending;

  const reset = () => {
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(newPassword);
    reset();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change password</AlertDialogTitle>
          <AlertDialogDescription>
            Set a new password for <strong>{userName}</strong>. Their existing
            sessions stay active; revoke sessions separately if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {tooShort && (
              <p className="text-xs text-destructive">
                Password must be at least {MIN_PASSWORD_LENGTH} characters.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {mismatch && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button disabled={!canSubmit} onClick={handleConfirm}>
              {isPending ? "Saving..." : "Change password"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
