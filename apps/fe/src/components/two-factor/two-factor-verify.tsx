import { useOtpCooldown } from "@/hooks/use-otp-cooldown";
import { authClient, refreshSessionCache } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
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
import { Link, useRouter } from "@tanstack/react-router";
import { AlertCircle, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
  trustDevice: z.boolean(),
});
const backupSchema = z.object({
  code: z.string().min(8, "Enter a backup code"),
});

type OtpValues = z.infer<typeof otpSchema>;
type BackupValues = z.infer<typeof backupSchema>;

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

export function TwoFactorVerify() {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  // The code is only emailed on request, so a re-render can never send a second one.
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const cooldown = useOtpCooldown();

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "", trustDevice: true },
  });
  const backupForm = useForm<BackupValues>({
    resolver: zodResolver(backupSchema),
    defaultValues: { code: "" },
  });

  const fail = (
    form: UseFormReturn<OtpValues> | UseFormReturn<BackupValues>,
    message: string
  ) => {
    form.setError("root", { message });
    toast.error(message);
  };

  const continueToApp = async () => {
    const session = await refreshSessionCache();

    // The root loader ran before verification, so its context has to be
    // rebuilt or the team guard reads a signed-out session and bounces to /login.
    await router.invalidate();

    const activeOrganizationId = session?.session?.activeOrganizationId;
    if (activeOrganizationId) {
      await router.navigate({
        to: "/$team",
        params: { team: activeOrganizationId },
        replace: true,
      });
    } else {
      await router.navigate({ to: "/onboarding", replace: true });
    }
  };

  const sendCode = async () => {
    if (sending || cooldown.isCooling) return;

    setSending(true);
    otpForm.clearErrors("root");
    try {
      const { error } = await authClient.twoFactor.sendOtp();
      if (error) {
        fail(otpForm, error.message ?? "Could not email your code");
        return;
      }
      cooldown.start();
      setCodeSent(true);
      toast.success("Code sent to your email");
    } catch (error) {
      fail(otpForm, messageOf(error, "Could not email your code"));
    } finally {
      setSending(false);
    }
  };

  const handleOtp = async (values: OtpValues) => {
    try {
      const { error } = await authClient.twoFactor.verifyOtp({
        code: values.code,
        trustDevice: values.trustDevice,
      });
      if (error) {
        fail(otpForm, error.message ?? "Invalid code, try again");
        return;
      }
      await continueToApp();
    } catch (error) {
      fail(otpForm, messageOf(error, "Could not verify the code"));
    }
  };

  const handleBackup = async (values: BackupValues) => {
    try {
      const { error } = await authClient.twoFactor.verifyBackupCode({
        code: values.code,
      });
      if (error) {
        fail(backupForm, error.message ?? "Invalid backup code");
        return;
      }
      toast.warning(
        "Backup code used — consider re-generating your codes in Profile Settings"
      );
      await continueToApp();
    } catch (error) {
      fail(backupForm, messageOf(error, "Could not verify the backup code"));
    }
  };

  return (
    <div className="bg-card w-full max-w-md rounded-2xl shadow-lg p-6 sm:p-10">
      <div className="space-y-1 text-center mb-6">
        <div className="bg-brand mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <ShieldCheck className="h-6 w-6 text-brand-foreground" />
        </div>
        <h2 className="text-brand text-2xl font-bold">
          Two-Factor Authentication
        </h2>
        <p className="text-muted-foreground text-sm">
          {useBackup
            ? "Enter one of your backup codes."
            : codeSent
              ? "Enter the 6-digit code we emailed you. It expires in 5 minutes."
              : "We will email you a 6-digit code to finish signing in."}
        </p>
      </div>

      {!useBackup ? (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(handleOtp)} className="space-y-5">
            <FormError message={otpForm.formState.errors.root?.message} />

            {!codeSent ? (
              <Button
                type="button"
                disabled={sending}
                onClick={sendCode}
                className="h-11 w-full font-semibold"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Email me a code
                  </>
                )}
              </Button>
            ) : (
              <>
                <FormField
                  control={otpForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-medium">
                        Authentication code
                      </FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          autoFocus
                          placeholder="123456"
                          className="h-11 tracking-widest text-center text-lg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={otpForm.control}
                  name="trustDevice"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <FormLabel className="text-muted-foreground text-sm">
                        Trust this device for 30 days
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={otpForm.formState.isSubmitting}
                  className="h-11 w-full font-semibold"
                >
                  {otpForm.formState.isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  disabled={sending || cooldown.isCooling}
                  onClick={sendCode}
                  className="w-full"
                >
                  {sending
                    ? "Sending..."
                    : cooldown.isCooling
                      ? `Resend code in ${cooldown.remaining}s`
                      : "Resend code"}
                </Button>
              </>
            )}
          </form>
        </Form>
      ) : (
        <Form {...backupForm}>
          <form
            onSubmit={backupForm.handleSubmit(handleBackup)}
            className="space-y-5"
          >
            <FormError message={backupForm.formState.errors.root?.message} />

            <FormField
              control={backupForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground text-sm font-medium">
                    Backup code
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder="xxxxx-xxxxx"
                      className="h-11 font-mono text-center"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={backupForm.formState.isSubmitting}
              className="h-11 w-full font-semibold"
            >
              {backupForm.formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                "Use backup code"
              )}
            </Button>
          </form>
        </Form>
      )}

      <div className="mt-6 space-y-2 text-center text-sm">
        <button
          type="button"
          onClick={() => setUseBackup((prev) => !prev)}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 font-medium transition-colors"
        >
          <KeyRound className="h-4 w-4" />
          {useBackup ? "Use an emailed code instead" : "Use a backup code"}
        </button>
        <div>
          <Link
            to="/login"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
