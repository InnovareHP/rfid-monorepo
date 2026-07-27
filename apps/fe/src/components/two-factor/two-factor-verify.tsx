import { authClient } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const totpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
  trustDevice: z.boolean(),
});
const backupSchema = z.object({
  code: z.string().min(8, "Enter a backup code"),
});

type TotpValues = z.infer<typeof totpSchema>;
type BackupValues = z.infer<typeof backupSchema>;

export function TwoFactorVerify() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [useBackup, setUseBackup] = useState(false);

  const totpForm = useForm<TotpValues>({
    resolver: zodResolver(totpSchema),
    defaultValues: { code: "", trustDevice: true },
  });
  const backupForm = useForm<BackupValues>({
    resolver: zodResolver(backupSchema),
    defaultValues: { code: "" },
  });

  const continueToApp = async () => {
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    const { data: session } = await authClient.getSession();
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

  const handleTotp = async (values: TotpValues) => {
    const { error } = await authClient.twoFactor.verifyTotp({
      code: values.code,
      trustDevice: values.trustDevice,
    });
    if (error) {
      toast.error(error.message ?? "Invalid code, try again");
      return;
    }
    await continueToApp();
  };

  const handleBackup = async (values: BackupValues) => {
    const { error } = await authClient.twoFactor.verifyBackupCode({
      code: values.code,
    });
    if (error) {
      toast.error(error.message ?? "Invalid backup code");
      return;
    }
    toast.warning(
      "Backup code used — consider re-generating your codes in Profile Settings"
    );
    await continueToApp();
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-white to-blue-50 shadow-lg p-6 sm:p-10">
      <div className="space-y-1 text-center mb-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-600 text-sm">
          {useBackup
            ? "Enter one of your backup codes."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
      </div>

      {!useBackup ? (
        <form
          onSubmit={totpForm.handleSubmit(handleTotp)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">
              Authentication code
            </Label>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              placeholder="123456"
              className="h-11 rounded-lg border border-gray-300 bg-white focus:border-blue-700 transition-colors tracking-widest text-center text-lg"
              {...totpForm.register("code")}
            />
            {totpForm.formState.errors.code && (
              <p className="text-sm text-red-600 font-medium">
                {totpForm.formState.errors.code.message}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              {...totpForm.register("trustDevice")}
            />
            Trust this device for 30 days
          </label>

          <Button
            type="submit"
            disabled={totpForm.formState.isSubmitting}
            className="w-full h-11 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            {totpForm.formState.isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              "Verify"
            )}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={backupForm.handleSubmit(handleBackup)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">
              Backup code
            </Label>
            <Input
              autoFocus
              placeholder="xxxxx-xxxxx"
              className="h-11 rounded-lg border border-gray-300 bg-white focus:border-blue-700 transition-colors font-mono text-center"
              {...backupForm.register("code")}
            />
            {backupForm.formState.errors.code && (
              <p className="text-sm text-red-600 font-medium">
                {backupForm.formState.errors.code.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={backupForm.formState.isSubmitting}
            className="w-full h-11 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            {backupForm.formState.isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              "Use backup code"
            )}
          </Button>
        </form>
      )}

      <div className="mt-6 space-y-2 text-center text-sm">
        <button
          type="button"
          onClick={() => setUseBackup((prev) => !prev)}
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          {useBackup ? "Use authenticator code instead" : "Use a backup code"}
        </button>
        <div>
          <Link
            to="/login"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
