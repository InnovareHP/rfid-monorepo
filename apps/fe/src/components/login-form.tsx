import { AuthPanel } from "@/components/auth-panel";
import { DashboardChoice } from "@/components/dashboard-choice";
import { DeviceSetupModal } from "@/components/passkeys/device-setup-modal";
import { PasswordInput } from "@/components/password-input";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Spinner } from "@dashboard/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Fingerprint, HeadphonesIcon, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type PendingNav = {
  activeOrganizationId: string | null | undefined;
  role: string;
};

// Length is not enforced here beyond a floor: the server owns the real policy
// and echoing it would drift.
const passwordSignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type PasswordSignIn = z.infer<typeof passwordSignInSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useRouter();
  const queryClient = useQueryClient();
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  // Everyone lands on the passkey offer first; that route sends them straight
  // on when they already have one or have declined before.
  const goToMainDashboard = async (data: PendingNav) => {
    setPendingNav(null);

    if (!data.activeOrganizationId) {
      await navigate.navigate({ to: "/onboarding", replace: true });
      return;
    }

    await navigate.navigate({ to: "/passkey-setup", replace: true });
  };

  const goToParamsDashboard = (params: string) => {
    setPendingNav(null);
    const supportUrl = `${import.meta.env.VITE_SUPPORT_URL || "http://localhost:3001"}${params}`;
    window.location.href = supportUrl;
  };

  // Shared by both credentials: read the session the sign-in just created and
  // route on role.
  const routeAfterSignIn = async () => {
    const { data: freshSession } = await authClient.getSession();
    queryClient.setQueryData(["session"], freshSession);

    // The root loader already ran with the signed-out session, so its context
    // has to be rebuilt before any guarded route reads user off it.
    await navigate.invalidate();

    const role = freshSession?.user?.role as string;
    const navData: PendingNav = {
      activeOrganizationId: freshSession?.session?.activeOrganizationId,
      role,
    };

    if ((role && role === ROLES.SUPPORT) || role === ROLES.SUPER_ADMIN) {
      setPendingNav(navData);
      return;
    }

    await goToMainDashboard(navData);
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

    await routeAfterSignIn();
    setSigningIn(false);
  };

  const form = useForm<PasswordSignIn>({
    resolver: zodResolver(passwordSignInSchema),
    defaultValues: { email: "", password: "" },
  });

  const handlePasswordLogin = async (values: PasswordSignIn) => {
    const { data, error } = await authClient.signIn.email(values);

    if (error) {
      toast.error(error.message ?? "Could not sign in.");
      return;
    }

    // The two-factor client redirects on its own, so there is no session to read.
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      return;
    }

    await routeAfterSignIn();
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
              Sign in with your password or passkey to continue.
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handlePasswordLogin)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="username"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/reset-password"
                        className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-10 xl:h-12 text-sm xl:text-base font-semibold rounded-lg transition-colors shadow-sm"
              >
                {form.formState.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" className="text-current" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span>Sign in</span>
                )}
              </Button>
            </form>
          </Form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
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
            href="#"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="#"
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
