import { useOtpCooldown } from "@/hooks/use-otp-cooldown";
import { authClient } from "@/lib/auth-client";
import {
  sendMigrationOtp,
  verifyMigrationOtp,
} from "@/services/passkeys/passkeys-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Step = "choose" | "paste" | "email" | "code";

type DeviceSetupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
};

export function DeviceSetupModal({
  open,
  onOpenChange,
  onEnrolled,
}: DeviceSetupModalProps) {
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [pending, setPending] = useState(false);
  const cooldown = useOtpCooldown();

  const reset = () => {
    setStep("choose");
    setEmail("");
    setCode("");
    setEnrollmentCode("");
    setPending(false);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const enroll = async (context: string) => {
    const { error } = await authClient.passkey.addPasskey({ context });
    if (error) {
      toast.error(error.message ?? "Could not register this device.");
      return;
    }
    toast.success("Device registered. You can sign in with your passkey.");
    onEnrolled();
    close();
  };

  const handlePaste = async () => {
    setPending(true);
    await enroll(enrollmentCode.trim());
    setPending(false);
  };

  const handleSendEmail = async () => {
    setPending(true);
    try {
      await sendMigrationOtp(email.trim());
      cooldown.start();
      setStep("code");
      toast.success("If that account can be set up, a code is on its way.");
    } catch {
      toast.error("Could not send a code right now.");
    }
    setPending(false);
  };

  // The cooldown starts on the click so a double press cannot mail two codes.
  const handleResendCode = async () => {
    if (cooldown.isCooling) return;

    cooldown.start();
    try {
      await sendMigrationOtp(email.trim());
      toast.success("A new code is on its way.");
    } catch {
      toast.error("Could not send a code right now.");
    }
  };

  const handleVerifyCode = async () => {
    setPending(true);
    try {
      const grant = await verifyMigrationOtp(email.trim(), code.trim());
      await enroll(grant.context);
    } catch {
      toast.error("That code is invalid or has expired.");
    }
    setPending(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up this device</DialogTitle>
          <DialogDescription>
            Register a passkey so this device can sign in on its own.
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep("paste")}
              className="flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 text-left transition-all hover:border-primary hover:bg-primary/10"
            >
              <KeyRound className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">I have an enrollment code</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Generated on a device you are already signed in on
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStep("email")}
              className="flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 text-left transition-all hover:border-primary hover:bg-primary/10"
            >
              <Mail className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Email me a code</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  For accounts that never registered a passkey
                </p>
              </div>
            </button>
          </div>
        )}

        {step === "paste" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="enrollment-code">Enrollment code</Label>
              <Input
                id="enrollment-code"
                value={enrollmentCode}
                onChange={(event) => setEnrollmentCode(event.target.value)}
                placeholder="Paste your code"
              />
            </div>
            <Button
              className="w-full"
              disabled={pending || enrollmentCode.trim().length === 0}
              onClick={handlePaste}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Register this device"
              )}
            </Button>
          </div>
        )}

        {step === "email" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-email">Email address</Label>
              <Input
                id="setup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button
              className="w-full"
              disabled={pending || email.trim().length === 0}
              onClick={handleSendEmail}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send code"
              )}
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-code">Verification code</Label>
              <Input
                id="setup-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
              />
            </div>
            <Button
              className="w-full"
              disabled={pending || code.trim().length !== 6}
              onClick={handleVerifyCode}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Register this device"
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={pending || cooldown.isCooling}
              onClick={handleResendCode}
            >
              {cooldown.isCooling
                ? `Resend code in ${cooldown.remaining}s`
                : "Resend code"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
