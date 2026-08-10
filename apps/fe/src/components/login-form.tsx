import { AuthPanel } from "@/components/auth-panel";
import { DashboardChoice } from "@/components/dashboard-choice";
import { DeviceSetupModal } from "@/components/passkeys/device-setup-modal";
import { authClient } from "@/lib/auth-client";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal-links";
import { ROLES } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Fingerprint, HeadphonesIcon, LayoutDashboard } from "lucide-react";
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
      <AuthPanel className={className} {...props}>
        <div className="space-y-5">
          <div className="space-y-1 text-center">
            <h2 className="text-3xl xl:text-4xl font-bold text-brand lg:whitespace-nowrap">
              Welcome back!
            </h2>
            <p className="text-sm xl:text-base text-muted-foreground">
              Sign in with your passkey to continue.
            </p>
          </div>

          <Button
            type="button"
            disabled={signingIn}
            onClick={handlePasskeyLogin}
            className="w-full h-10 xl:h-12 text-sm xl:text-base font-semibold rounded-lg transition-colors shadow-sm"
          >
            {signingIn ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-current" />
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 xl:w-5 xl:h-5" />
                <span>Sign in with a passkey</span>
              </div>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your passkey stays on this device and is unlocked with your
            fingerprint, face, or device PIN.
          </p>

          <div className="text-center text-sm text-muted-foreground pt-1">
            New device?{" "}
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Set it up here.
            </button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Create one.
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </a>
          .
        </div>
      </AuthPanel>

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
            <DialogDescription className="text-sm text-muted-foreground">
              Your account has access to multiple dashboards. Where would you
              like to go?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            <DashboardChoice
              icon={LayoutDashboard}
              title="Main Dashboard"
              description="Lead management, referrals & analytics"
              onClick={() => pendingNav && goToMainDashboard(pendingNav)}
            />

            {pendingNav?.role === ROLES.SUPPORT ? (
              <DashboardChoice
                icon={HeadphonesIcon}
                title="Support Dashboard"
                description="Manage tickets, chats & support requests"
                onClick={() => goToParamsDashboard("/support")}
              />
            ) : (
              <DashboardChoice
                icon={LayoutDashboard}
                title="Admin Dashboard"
                description="Manage users, roles & permissions"
                onClick={() => pendingNav && goToParamsDashboard("/admin")}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
