import { TwoFactorSettings } from "@/components/two-factor/two-factor-settings";
import { authClient } from "@/lib/auth-client";
import { getSecondFactorRequirement } from "@/services/compliance/compliance-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Separator } from "@dashboard/ui/components/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const SECOND_FACTOR_KEY = ["second-factor"];

// HipaaGuard already refuses every PHI route without a second factor, so
// without this the user meets a wall of opaque 403s with nothing to act on.
// The setup lives inside the modal rather than behind a link: gating the layout
// would also gate the settings page the user needs to reach to satisfy it.
export function SecondFactorGate() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: SECOND_FACTOR_KEY,
    queryFn: getSecondFactorRequirement,
    staleTime: 1000 * 60,
  });

  const addPasskey = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.passkey.addPasskey();
      if (error) throw new Error(error.message ?? "Could not add a passkey.");
    },
    onSuccess: async () => {
      toast.success("Passkey added.");
      await queryClient.invalidateQueries({ queryKey: SECOND_FACTOR_KEY });
    },
    onError: (error) => toast.error(error.message),
  });

  // Nothing renders until the answer is known, so a slow reply cannot flash a
  // gate at a user who already has a passkey.
  if (!data?.required || data.satisfied) return null;

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-lg"
        // No close button, no dismiss on escape or outside click: the app is
        // unusable until this is done, and offering an exit would only hide it.
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Two-factor authentication required
          </DialogTitle>
          <DialogDescription>
            This organization has HIPAA mode enabled. Patient data stays locked
            until you add a second factor to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Add a passkey</p>
            <p className="text-sm text-muted-foreground">
              Fastest option, and it replaces your password at sign-in.
            </p>
            <Button
              className="w-full sm:w-auto"
              disabled={addPasskey.isPending}
              onClick={() => addPasskey.mutate()}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {addPasskey.isPending ? "Waiting for device..." : "Add a passkey"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Or use an emailed code
            </p>
            <p className="text-sm text-muted-foreground">
              We email a 6-digit code each time you sign in.
            </p>
            <TwoFactorSettings
              enabled={false}
              onChange={() =>
                queryClient.invalidateQueries({ queryKey: SECOND_FACTOR_KEY })
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
