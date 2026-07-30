import { DeviceSetupModal } from "@/components/passkeys/device-setup-modal";
import { authClient } from "@/lib/auth-client";
import { ROLES } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { cn } from "@dashboard/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Fingerprint, HeadphonesIcon, LayoutDashboard, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PendingNav = {
  activeOrganizationId: string | null | undefined;
  role: string;
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useRouter();
  const queryClient = useQueryClient();
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const goToMainDashboard = async (data: PendingNav) => {
    setPendingNav(null);

    if (data.activeOrganizationId) {
      await navigate.navigate({
        to: "/$team",
        params: { team: data.activeOrganizationId },
        replace: true,
      });
    } else {
      await navigate.navigate({ to: "/onboarding", replace: true });
    }
  };

  const goToParamsDashboard = (params: string) => {
    setPendingNav(null);
    const supportUrl = `${import.meta.env.VITE_SUPPORT_URL || "http://localhost:3001"}${params}`;
    window.location.href = supportUrl;
  };

  // Discoverable credentials let the browser offer the accounts it holds, so
  // there is no email field to fill in.
  const handlePasskeyLogin = async () => {
    setSigningIn(true);
    const { error } = await authClient.signIn.passkey();

    if (error) {
      setSigningIn(false);
      toast.error(error.message ?? "Could not sign in with a passkey.");
      return;
    }

    const { data: freshSession } = await authClient.getSession();
    queryClient.setQueryData(["session"], freshSession);

    const role = freshSession?.user?.role as string;
    const navData: PendingNav = {
      activeOrganizationId: freshSession?.session?.activeOrganizationId,
      role,
    };

    setSigningIn(false);

    if ((role && role === ROLES.SUPPORT) || role === ROLES.SUPER_ADMIN) {
      setPendingNav(navData);
      return;
    }

    await goToMainDashboard(navData);
  };

  return (
    <>
      <div
        className={cn(
          "[--panelw:clamp(26rem,30vw,34rem)] [--gapw:1rem] xl:[--gapw:1.5rem] [--framew:2rem] xl:[--framew:3rem] p-0 lg:p-4 xl:p-6",
          className
        )}
        {...props}
      >
        <div className="flex items-stretch justify-center w-full mx-auto max-w-[96rem] lg:gap-[var(--gapw)] lg:h-[min(calc(100svh-var(--framew)),calc((100vw-var(--panelw)-var(--gapw)-var(--framew))*1.183),64rem)]">
          {/* Left Side - Design image */}
          <div className="hidden lg:block h-full aspect-[1300/1538] shrink-0 overflow-hidden rounded-3xl shadow-xl">
            <img
              src="/login-page/Inner.png"
              alt="See every referral. Track every opportunity."
              className="h-full w-full object-cover"
            />
          </div>

          {/* Right Side - Login Panel */}
          <div className="w-full lg:w-[var(--panelw)] lg:shrink-0 min-h-svh lg:min-h-0 lg:h-full lg:overflow-y-auto rounded-none lg:rounded-3xl shadow-none lg:shadow-xl bg-gradient-to-b from-blue-900 via-blue-600 to-sky-300 lg:bg-gradient-to-br lg:from-sky-200 lg:via-blue-100 lg:to-blue-200 flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8 lg:gap-6 lg:p-6 xl:p-8">
            <img
              src="/login-page/Refidly%20[Full]%20-%20White%201.png"
              alt="Refidly — See it. Track it. Move it."
              className="w-36 sm:w-44 lg:hidden"
            />
            <div className="w-full max-w-md lg:max-w-none rounded-2xl bg-gradient-to-b from-white to-blue-50 shadow-lg p-6 sm:p-8 lg:p-7 xl:p-9">
              <div className="space-y-5">
                <div className="space-y-1 text-center">
                  <h2 className="text-3xl xl:text-4xl font-bold text-blue-900 lg:whitespace-nowrap">
                    Welcome back!
                  </h2>
                  <p className="text-sm xl:text-base text-gray-600">
                    Sign in with your passkey to continue.
                  </p>
                </div>

                <Button
                  type="button"
                  disabled={signingIn}
                  onClick={handlePasskeyLogin}
                  className="w-full h-10 xl:h-12 text-sm xl:text-base bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors shadow-sm"
                >
                  {signingIn ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 xl:w-5 xl:h-5" />
                      <span>Sign in with a passkey</span>
                    </div>
                  )}
                </Button>

                <p className="text-center text-xs text-gray-500">
                  Your passkey stays on this device and is unlocked with your
                  fingerprint, face, or device PIN.
                </p>

                <div className="text-center text-sm text-gray-600 pt-1">
                  New device?{" "}
                  <button
                    type="button"
                    onClick={() => setSetupOpen(true)}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Set it up here.
                  </button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Create one.
                  </Link>
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-gray-500">
                By continuing, you agree to our{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
                >
                  Privacy Policy
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeviceSetupModal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onEnrolled={() => setSetupOpen(false)}
      />

      {/* Dashboard selection dialog for support / super_admin roles */}
      <Dialog
        open={pendingNav !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNav(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Choose a Dashboard
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Your account has access to multiple dashboards. Where would you
              like to go?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={() => pendingNav && goToMainDashboard(pendingNav)}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/10 transition-all text-left group"
            >
              <div className="p-2.5 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors flex-shrink-0">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  Main Dashboard
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lead management, referrals &amp; analytics
                </p>
              </div>
            </button>

            {pendingNav?.role === ROLES.SUPPORT ? (
              <button
                onClick={() => goToParamsDashboard("/support")}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/10 transition-all text-left group"
              >
                <div className="p-2.5 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors flex-shrink-0">
                  <HeadphonesIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    Support Dashboard
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage tickets, chats &amp; support requests
                  </p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => pendingNav && goToParamsDashboard("/admin")}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary hover:bg-primary/10 transition-all text-left group"
              >
                <div className="p-2.5 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors flex-shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    Admin Dashboard
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage users, roles &amp; permissions
                  </p>
                </div>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
