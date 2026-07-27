import { authClient } from "@/lib/auth-client";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle, Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(8, "Password is required"),
});
const codeSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type CodeValues = z.infer<typeof codeSchema>;

type Step = "idle" | "enable-password" | "verify" | "backup" | "disable-password";

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const reset = () => {
    passwordForm.reset();
    codeForm.reset();
    setTotpURI("");
    setBackupCodes([]);
    setStep("idle");
  };

  const handleEnable = async (values: PasswordValues) => {
    const { data, error } = await authClient.twoFactor.enable({
      password: values.password,
    });
    if (error || !data) {
      toast.error(error?.message ?? "Failed to start 2FA setup");
      return;
    }
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
    passwordForm.reset();
    setStep("verify");
  };

  const handleVerify = async (values: CodeValues) => {
    const { error } = await authClient.twoFactor.verifyTotp({
      code: values.code,
    });
    if (error) {
      toast.error(error.message ?? "Invalid code, try again");
      return;
    }
    codeForm.reset();
    toast.success("Two-factor authentication enabled");
    setStep("backup");
  };

  const handleDisable = async (values: PasswordValues) => {
    const { error } = await authClient.twoFactor.disable({
      password: values.password,
    });
    if (error) {
      toast.error(error.message ?? "Failed to disable 2FA");
      return;
    }
    toast.success("Two-factor authentication disabled");
    reset();
    router.invalidate();
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Backup codes copied");
  };

  const finishEnrollment = () => {
    reset();
    router.invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="w-4 h-4 text-green-600" />
          ) : (
            <ShieldOff className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-medium text-foreground">
            Two-Factor Authentication
          </span>
        </div>
        {enabled ? (
          <Badge className="bg-green-100 text-green-700 border-2 border-green-300 font-semibold">
            Enabled
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-600 font-semibold">
            Off
          </Badge>
        )}
      </div>

      {step === "idle" && (
        <Button
          variant="outline"
          className="w-full justify-start border-primary/40 hover:bg-primary/10"
          onClick={() => setStep(enabled ? "disable-password" : "enable-password")}
        >
          {enabled ? (
            <>
              <ShieldOff className="w-4 h-4 mr-2" />
              Disable 2FA
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Enable 2FA
            </>
          )}
        </Button>
      )}

      {(step === "enable-password" || step === "disable-password") && (
        <form
          onSubmit={passwordForm.handleSubmit(
            step === "enable-password" ? handleEnable : handleDisable
          )}
          className="space-y-4 border-2 border-primary/30 rounded-lg p-4 bg-primary/10"
        >
          <div className="space-y-2">
            <Label className="text-foreground font-medium">
              Confirm your password
            </Label>
            <Input
              type="password"
              autoFocus
              className="border-primary/40 focus:ring-2 focus:ring-primary"
              {...passwordForm.register("password")}
            />
            {passwordForm.formState.errors.password && (
              <p className="text-sm text-red-600 font-medium">
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step === "enable-password" ? (
                "Continue"
              ) : (
                "Disable 2FA"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {step === "verify" && (
        <form
          onSubmit={codeForm.handleSubmit(handleVerify)}
          className="space-y-4 border-2 border-primary/30 rounded-lg p-4 bg-primary/10"
        >
          <p className="text-sm text-gray-700">
            Scan this QR code with your authenticator app (Google
            Authenticator, 1Password, Authy…), then enter the 6-digit code.
          </p>
          <div className="flex justify-center rounded-lg bg-white p-4 border border-gray-300">
            <QRCodeSVG value={totpURI} size={168} />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium">6-digit code</Label>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              className="border-primary/40 focus:ring-2 focus:ring-primary tracking-widest text-center"
              {...codeForm.register("code")}
            />
            {codeForm.formState.errors.code && (
              <p className="text-sm text-red-600 font-medium">
                {codeForm.formState.errors.code.message}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={codeForm.formState.isSubmitting}
            >
              {codeForm.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Verify & Enable"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {step === "backup" && (
        <div className="space-y-4 border-2 border-green-300 rounded-lg p-4 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-green-900">
              2FA enabled — save your backup codes
            </p>
          </div>
          <p className="text-sm text-gray-700">
            Each code can be used once if you lose access to your
            authenticator. Store them somewhere safe — they will not be shown
            again.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-4 border border-gray-300 font-mono text-sm">
            {backupCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={copyBackupCodes}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy codes
            </Button>
            <Button
              type="button"
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={finishEnrollment}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
