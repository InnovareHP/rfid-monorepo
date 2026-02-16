import { authClient } from "@/lib/auth-client";
import {
  getInvitationDetails,
  type InvitationDetails,
  verifyInviteEmail,
} from "@/services/invitation/invitation-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
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
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ErrorContext } from "better-auth/react";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";

type PageState =
  | { step: "loading" }
  | { step: "accepting" }
  | { step: "form"; mode: "login" | "register"; invitation: InvitationDetails }
  | { step: "success"; organizationId: string }
  | { step: "rejected" }
  | { step: "error"; message: string };

const AcceptInvitation = ({ action }: { action: "accept" | "reject" }) => {
  const { token } = useSearch({ from: "/invitation/$action" }) as {
    token: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PageState>({ step: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ step: "error", message: "Missing invitation token." });
      return;
    }

    const init = async () => {
      try {
        // Check if user is already authenticated
        const { data: sessionData } = await authClient.getSession();

        if (sessionData?.user) {
          // Already logged in — process directly
          if (action === "reject") {
            await authClient.organization.rejectInvitation({
              invitationId: token,
            });
            setState({ step: "rejected" });
            return;
          }

          setState({ step: "accepting" });
          await acceptAndRedirect();
          return;
        }

        // Not authenticated — fetch invitation details to show form
        if (action === "reject") {
          setState({
            step: "error",
            message: "You must be logged in to reject an invitation.",
          });
          return;
        }

        const invitation = await getInvitationDetails(token);
        setState({
          step: "form",
          mode: invitation.userExists ? "login" : "register",
          invitation,
        });
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Invalid or expired invitation.";
        setState({ step: "error", message });
      }
    };

    init();
  }, [token, action]);

  const acceptAndRedirect = async () => {
    const { data: acceptData } =
      await authClient.organization.acceptInvitation({
        invitationId: token,
      });

    const organizationId = acceptData?.member?.organizationId;

    if (organizationId) {
      await authClient.organization.setActive({ organizationId });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      setState({ step: "success", organizationId });
    } else {
      setState({ step: "success", organizationId: "" });
    }
  };

  if (state.step === "loading" || state.step === "accepting") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">
          {state.step === "accepting"
            ? "Accepting invitation..."
            : "Loading..."}
        </span>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
        <p>{state.message}</p>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="mt-4 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          Go back to Login
        </button>
      </div>
    );
  }

  if (state.step === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-green-600">
        <p>Invitation rejected.</p>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="mt-4 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (state.step === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-green-600">
        <p>Invitation accepted successfully!</p>
        <button
          onClick={() =>
            navigate({
              to: state.organizationId ? "/$team" : "/login",
              params: state.organizationId
                ? { team: state.organizationId }
                : undefined,
            })
          }
          className="mt-4 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // step === "form"
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            You've been invited
          </CardTitle>
          <CardDescription>
            <span className="font-medium text-foreground">
              {state.invitation.inviterName}
            </span>{" "}
            invited you to join{" "}
            <span className="font-medium text-foreground">
              {state.invitation.organizationName}
            </span>
          </CardDescription>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm mx-auto">
            <Mail className="w-3.5 h-3.5" />
            {state.invitation.email}
          </div>
        </CardHeader>
        <CardContent>
          {state.mode === "login" ? (
            <LoginForm
              email={state.invitation.email}
              onSuccess={acceptAndRedirect}
            />
          ) : (
            <RegisterForm
              email={state.invitation.email}
              token={token}
              onSuccess={acceptAndRedirect}
            />
          )}
          <div className="text-center text-sm text-muted-foreground mt-4">
            {state.mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                  onClick={() =>
                    setState((s) =>
                      s.step === "form"
                        ? { ...s, mode: "register" }
                        : s
                    )
                  }
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                  onClick={() =>
                    setState((s) =>
                      s.step === "form" ? { ...s, mode: "login" } : s
                    )
                  }
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Inline Login Form ---

const loginSchema = z.object({
  password: z.string().min(8),
});

function LoginForm({
  email,
  onSuccess,
}: {
  email: string;
  onSuccess: () => Promise<void>;
}) {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      await authClient.signIn.email(
        { email, password: values.password },
        {
          onError: (ctx: ErrorContext) => {
            toast.error(ctx.error.message);
          },
          onSuccess: async () => {
            try {
              await onSuccess();
            } catch (err: any) {
              toast.error(
                err?.message || "Failed to accept invitation after login."
              );
            }
          },
        }
      );
    } catch {
      toast.error("Failed to sign in.");
    }
  };

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(handleLogin)}
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                Password
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter your password"
                    className="h-12 pl-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          disabled={form.formState.isSubmitting}
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
        >
          {form.formState.isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Signing in...</span>
            </div>
          ) : (
            "Sign In & Accept"
          )}
        </Button>
      </form>
    </Form>
  );
}

// --- Inline Register Form ---

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function RegisterForm({
  email,
  token,
  onSuccess,
}: {
  email: string;
  token: string;
  onSuccess: () => Promise<void>;
}) {
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  const handleRegister = async (values: z.infer<typeof registerSchema>) => {
    try {
      // 1. Create account
      const { error } = await authClient.signUp.email({
        email,
        password: values.password,
        name: values.name,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // 2. Verify email & skip onboarding via backend
      await verifyInviteEmail(token);

      // 3. Sign in to create a session
      await authClient.signIn.email(
        { email, password: values.password },
        {
          onError: (ctx: ErrorContext) => {
            toast.error(ctx.error.message);
          },
          onSuccess: async () => {
            try {
              // 4. Accept invitation & set active org
              await onSuccess();
            } catch (err: any) {
              toast.error(
                err?.message || "Failed to accept invitation after registration."
              );
            }
          },
        }
      );
    } catch {
      toast.error("Failed to create account.");
    }
  };

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(handleRegister)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                Full Name
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    {...field}
                    placeholder="John Doe"
                    className="h-12 pl-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                  />
                </div>
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
              <FormLabel className="text-sm font-semibold text-gray-700">
                Password
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    {...field}
                    type="password"
                    placeholder="Min. 8 characters"
                    className="h-12 pl-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                Confirm Password
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    {...field}
                    type="password"
                    placeholder="Confirm password"
                    className="h-12 pl-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          disabled={form.formState.isSubmitting}
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
        >
          {form.formState.isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating account...</span>
            </div>
          ) : (
            "Create Account & Accept"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default AcceptInvitation;
