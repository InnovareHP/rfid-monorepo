import { AuthPanel } from "@/components/auth-panel";
import { authClient } from "@/lib/auth-client";
import { waivePasskeyPrompt } from "@/services/passkeys/passkeys-service";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { Fingerprint, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

const BENEFITS = [
  {
    icon: Zap,
    title: "Sign in without typing",
    body: "Your fingerprint, face, or device PIN replaces the password field.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing to phish",
    body: "A passkey never leaves this device and cannot be handed to a fake page.",
  },
  {
    icon: KeyRound,
    title: "Your password still works",
    body: "This adds a second way in. It does not take the first one away.",
  },
];

export function PasskeySetupPage({ onDone }: { onDone: () => void }) {
  const enroll = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.passkey.addPasskey();
      if (error) throw new Error(error.message ?? "Could not add a passkey.");
    },
    onSuccess: () => {
      toast.success("Passkey added. You can use it next time you sign in.");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Declining is recorded so this page is offered once, not every sign-in.
  const waive = useMutation({
    mutationFn: waivePasskeyPrompt,
    onSuccess: onDone,
    onError: () => {
      toast.error("Could not save that choice. Continuing anyway.");
      onDone();
    },
  });

  const busy = enroll.isPending || waive.isPending;

  return (
    <AuthPanel>
      <div className="space-y-6">
        <div className="space-y-1 text-center">
          <div className="bg-primary/10 mx-auto flex size-12 items-center justify-center rounded-xl">
            <Fingerprint className="text-primary size-6" />
          </div>
          <h2 className="text-2xl xl:text-3xl font-bold text-brand">
            Add a passkey?
          </h2>
          <p className="text-sm xl:text-base text-muted-foreground">
            Optional, and you can do it later from Security settings.
          </p>
        </div>

        <ul className="space-y-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex items-start gap-3">
              <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                <benefit.icon className="text-muted-foreground size-4" />
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold">
                  {benefit.title}
                </p>
                <p className="text-muted-foreground text-xs">{benefit.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => enroll.mutate()}
            className="h-10 xl:h-12 w-full rounded-lg text-sm font-semibold shadow-sm xl:text-base"
          >
            {enroll.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-current" />
                <span>Waiting for your device...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Fingerprint className="size-4 xl:size-5" />
                <span>Set up a passkey</span>
              </div>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => waive.mutate()}
            className="h-10 w-full text-sm font-semibold"
          >
            {waive.isPending ? "Continuing..." : "Not now"}
          </Button>
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Choosing Not now keeps password sign-in and stops us asking again.
        </p>
      </div>
    </AuthPanel>
  );
}
