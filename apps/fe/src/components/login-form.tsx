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
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorContext } from "better-auth/react";
import {
  HeadphonesIcon,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";

type PendingNav = {
  activeOrganizationId: string | null | undefined;
  role: string;
};

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.35 11.1H12v3.2h5.38c-.5 2.5-2.62 3.9-5.38 3.9a5.95 5.95 0 1 1 0-11.9c1.52 0 2.9.56 3.98 1.48l2.4-2.4A9.53 9.53 0 0 0 12 2.75a9.25 9.25 0 1 0 0 18.5c4.63 0 9.15-3.37 9.35-10.15Z" />
    </svg>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useRouter();
  const queryClient = useQueryClient();
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null);

  const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    try {
      await authClient.signIn.email(
        {
          email: values.email,
          password: values.password,
        },
        {
          onError: (ctx: ErrorContext): void => {
            toast.error(ctx.error.message);
          },
          onSuccess: async () => {
            const { data: freshSession } = await authClient.getSession();
            queryClient.setQueryData(["session"], freshSession);

            const role = freshSession?.user?.role as string;
            const navData: PendingNav = {
              activeOrganizationId: freshSession?.session?.activeOrganizationId,
              role: role,
            };

            if (
              (role && role === ROLES.SUPPORT) ||
              role === ROLES.SUPER_ADMIN
            ) {
              setPendingNav(navData);
              return;
            }

            await goToMainDashboard(navData);
          },
        }
      );
    } catch (error) {
      return toast.error("Failed to login");
    }
  };

  return (
    <>
      <div className={cn("gap-0 p-0 lg:p-4", className)} {...props}>
        <div className="flex items-stretch w-full lg:gap-6 lg:min-h-[42rem]">
          {/* Left Side - Design image */}
          <div className="hidden lg:block lg:w-1/2 overflow-hidden rounded-3xl shadow-xl">
            <img
              src="/login-page/Inner.png"
              alt="See every referral. Track every opportunity."
              className="h-full w-full object-cover"
            />
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full lg:w-1/2 min-h-svh lg:min-h-0 rounded-none lg:rounded-3xl shadow-none lg:shadow-xl bg-gradient-to-b from-blue-900 via-blue-600 to-sky-300 lg:bg-gradient-to-br lg:from-sky-200 lg:via-blue-100 lg:to-blue-200 flex flex-col items-center justify-center gap-10 px-4 py-12 sm:px-8 lg:p-12">
            <img
              src="/login-page/Refidly%20[Full]%20-%20White%201.png"
              alt="Refidly — See it. Track it. Move it."
              className="w-44 sm:w-52 lg:hidden"
            />
            <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-white to-blue-50 shadow-lg p-6 sm:p-10">
              <Form {...form}>
                <form
                  className="space-y-6"
                  onSubmit={form.handleSubmit(handleLogin)}
                >
                  <div className="space-y-1 text-center">
                    <h2 className="text-3xl font-bold text-blue-900">
                      Welcome back!
                    </h2>
                    <p className="text-gray-600">
                      Sign in to your account to continue.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="m@example.com"
                              className="h-11 rounded-lg border border-gray-300 bg-white focus:border-blue-700 transition-colors"
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
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel className="text-sm font-medium text-gray-900">
                              Password
                            </FormLabel>
                            <Link
                              to="/reset-password"
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              Forgot password?
                            </Link>
                          </div>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              className="h-11 rounded-lg border border-gray-300 bg-white focus:border-blue-700 transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      disabled={form.formState.isSubmitting}
                      type="submit"
                      className="w-full h-11 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      {form.formState.isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Signing in...</span>
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-300" aria-hidden />
                      <span className="text-xs font-medium tracking-wider text-gray-500 whitespace-nowrap">
                        OR CONTINUE WITH
                      </span>
                      <div className="h-px flex-1 bg-gray-300" aria-hidden />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        aria-label="Continue with Google"
                        className="flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <GoogleIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="More sign-in options"
                        className="flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <LayoutGrid className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="text-center text-sm text-gray-600 pt-2">
                      Don't have an account?{" "}
                      <Link
                        to="/register"
                        className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Sign up for free.
                      </Link>
                    </div>
                  </div>
                </form>
              </Form>
              <div className="mt-8 text-center text-xs text-gray-500">
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
