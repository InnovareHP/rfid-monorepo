import { BaaSignModal } from "@/components/compliance/baa-sign-modal";
import { TwoFactorSettings } from "@/components/two-factor/two-factor-settings";
import { authClient } from "@/lib/auth-client";
import {
  getBaaTerms,
  getSecondFactorRequirement,
} from "@/services/compliance/compliance-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StepRow } from "./hipaa-gate-step";

export const HIPAA_GATE_KEY = ["hipaa-readiness"];

// HipaaGuard refuses every PHI route until the organization holds a current BAA
// and the user holds a second factor. Without this the only symptom is a 403
// with nothing to act on, so both requirements are listed in order and each one
// says whether it is done.
//
// The work happens inside the modal rather than behind links: gating the layout
// also gates the settings pages a user would need to reach to satisfy it.
export function HipaaGate() {
  const queryClient = useQueryClient();
  const [signOpen, setSignOpen] = useState(false);

  const { data } = useQuery({
    queryKey: HIPAA_GATE_KEY,
    queryFn: getSecondFactorRequirement,
    staleTime: 1000 * 60,
  });

  const blocked = Boolean(
    data?.required && (!data.satisfied || !data.baaCurrent)
  );

  const { data: terms } = useQuery({
    queryKey: ["baa-terms"],
    queryFn: getBaaTerms,
    // Only the person who can sign needs the terms, and only while blocked.
    enabled: blocked && Boolean(data?.canSignBaa) && !data?.baaCurrent,
  });

  const addPasskey = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.passkey.addPasskey();
      if (error) throw new Error(error.message ?? "Could not add a passkey.");
    },
    onSuccess: async () => {
      toast.success("Passkey added.");
      await queryClient.invalidateQueries({ queryKey: HIPAA_GATE_KEY });
    },
    onError: (error) => toast.error(error.message),
  });

  // Nothing renders until the answer is known, so a slow reply cannot flash a
  // gate at someone who is already compliant.
  if (!data || !blocked) return null;

  return (
    <>
      <Dialog open>
        <DialogContent
          className="sm:max-w-lg"
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              Two steps before you can continue
            </DialogTitle>
            <DialogDescription>
              This organization has HIPAA mode enabled. Patient data stays
              locked until both of these are done.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <StepRow
              index={1}
              title="Business Associate Agreement signed"
              description={
                data.canSignBaa
                  ? "Required before anyone here can open patient data."
                  : "An owner has to sign this. Ask them to complete it from Compliance settings."
              }
              done={data.baaCurrent}
            >
              {data.canSignBaa ? (
                <Button
                  disabled={!terms}
                  onClick={() => setSignOpen(true)}
                  className="w-full sm:w-auto"
                >
                  {terms ? "Review and sign" : "Loading agreement..."}
                </Button>
              ) : null}
            </StepRow>

            <StepRow
              index={2}
              title="A second factor on your account"
              description="A passkey is fastest and replaces your password at sign-in. An emailed code works too."
              done={data.satisfied}
            >
              <div className="space-y-3">
                <Button
                  variant={data.baaCurrent ? "default" : "outline"}
                  disabled={addPasskey.isPending}
                  onClick={() => addPasskey.mutate()}
                  className="w-full sm:w-auto"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {addPasskey.isPending
                    ? "Waiting for device..."
                    : "Add a passkey"}
                </Button>

                <TwoFactorSettings
                  enabled={false}
                  onChange={() =>
                    queryClient.invalidateQueries({ queryKey: HIPAA_GATE_KEY })
                  }
                />
              </div>
            </StepRow>
          </div>
        </DialogContent>
      </Dialog>

      {terms ? (
        <BaaSignModal
          terms={terms}
          open={signOpen}
          onOpenChange={(next) => {
            setSignOpen(next);
            if (!next) {
              queryClient.invalidateQueries({ queryKey: HIPAA_GATE_KEY });
            }
          }}
        />
      ) : null}
    </>
  );
}
