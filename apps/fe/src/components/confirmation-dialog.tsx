import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFormFooter,
  AlertDialogFormHeader,
} from "@dashboard/ui/components/alert-dialog";
import { Button } from "@dashboard/ui/components/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmationDialogProps) {
  const isDestructive = variant === "destructive";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent variant="shell" className="sm:max-w-lg">
        <AlertDialogFormHeader
          icon={isDestructive ? <AlertTriangle /> : <CheckCircle2 />}
          iconClassName={
            isDestructive ? "bg-destructive text-destructive-foreground" : ""
          }
          title={title}
          description={description}
        />
        <AlertDialogFormFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">{cancelText}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={onConfirm}
              variant={isDestructive ? "destructive" : "default"}
            >
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFormFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
