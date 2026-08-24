import { PasswordInput } from "@/components/password-input";
import { authClient } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
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

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// Failures surface twice: a toast, and a line that stays in the form once it fades.
const FormError = ({ message }: { message?: string }) =>
  message ? (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  ) : null;

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const fail = (
    form: UseFormReturn<PasswordValues> | UseFormReturn<CodeValues>,
    message: string
  ) => {
    form.setError("root", { message });
    toast.error(message);
  };

  const reset = () => {
    passwordForm.reset();
    codeForm.reset();
    setBackupCodes([]);
    setStep("idle");
  };

  const handleEnable = async (values: PasswordValues) => {
    try {
      const { data, error } = await authClient.twoFactor.enable({
        password: values.password,
      });
      if (error || !data) {
        fail(passwordForm, error?.message ?? "Failed to start 2FA setup");
        return;
      }

      const { error: sendError } = await authClient.twoFactor.sendOtp();
      if (sendError) {
        fail(
          passwordForm,
          sendError.message ?? "Could not email your verification code"
        );
        return;
      }

      setBackupCodes(data.backupCodes);
      passwordForm.reset();
      setStep("verify");
      toast.success("Verification code sent to your email");
    } catch (error) {
      fail(passwordForm, messageOf(error, "Failed to start 2FA setup"));
    }
  };

  const handleVerify = async (values: CodeValues) => {
    try {
      const { error } = await authClient.twoFactor.verifyOtp({
        code: values.code,
      });
      if (error) {
        fail(codeForm, error.message ?? "Invalid code, try again");
        return;
      }
      codeForm.reset();
      toast.success("Two-factor authentication enabled");
      setStep("backup");
    } catch (error) {
      fail(codeForm, messageOf(error, "Could not verify the code"));
    }
  };

  const handleResend = async () => {
    codeForm.clearErrors("root");
    const { error } = await authClient.twoFactor.sendOtp();
    if (error) {
      fail(codeForm, error.message ?? "Could not email a new code");
      return;
    }
    toast.success("A new code is on its way");
  };

  const handleDisable = async (values: PasswordValues) => {
    try {
      const { error } = await authClient.twoFactor.disable({
        password: values.password,
      });
      if (error) {
        fail(passwordForm, error.message ?? "Failed to disable 2FA");
        return;
      }
      toast.success("Two-factor authentication disabled");
      reset();
      router.invalidate();
    } catch (error) {
      fail(passwordForm, messageOf(error, "Failed to disable 2FA"));
    }
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
      {step === "idle" && (
        <Button
          className="w-full bg-brand text-white hover:bg-brand/90 sm:w-auto"
          onClick={() => setStep(enabled ? "disable-password" : "enable-password")}
        >
          {enabled ? (
            <>
              <ShieldOff className="w-4 h-4 mr-2" />
              Disable
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Enable
            </>
          )}
        </Button>
      )}

      {(step === "enable-password" || step === "disable-password") && (
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(
              step === "enable-password" ? handleEnable : handleDisable
            )}
            className="space-y-4 border-2 border-primary/30 rounded-lg p-4 bg-primary/10"
          >
            <FormError message={passwordForm.formState.errors.root?.message} />

            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">
                    Confirm your password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoFocus
                      className="border-primary/40 focus:ring-2 focus:ring-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
        </Form>
      )}

      {step === "verify" && (
        <Form {...codeForm}>
          <form
            onSubmit={codeForm.handleSubmit(handleVerify)}
            className="space-y-4 border-2 border-primary/30 rounded-lg p-4 bg-primary/10"
          >
            <p className="text-sm text-muted-foreground">
              We emailed you a 6-digit code. Enter it below to finish enabling
              two-factor authentication. It expires in 5 minutes.
            </p>

            <FormError message={codeForm.formState.errors.root?.message} />

            <FormField
              control={codeForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">
                    6-digit code
                  </FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      autoFocus
                      className="border-primary/40 focus:ring-2 focus:ring-primary tracking-widest text-center"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-2">
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
              <Button type="button" variant="outline" onClick={handleResend}>
                Resend code
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === "backup" && (
        <div className="space-y-4 border-2 border-success/30 rounded-lg p-4 bg-success/10">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <p className="text-sm font-semibold text-success">
              2FA enabled — save your backup codes
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Each code can be used once if you cannot reach your email. Store
            them somewhere safe — they will not be shown again.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-card p-4 border border-border font-mono text-sm">
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
