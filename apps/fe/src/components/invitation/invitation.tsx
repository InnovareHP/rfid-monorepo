import { authClient } from "@/lib/auth-client";
import { verifyInviteEmail } from "@/services/invitation/invitation-service";
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
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";

type InvitationData = {
  email: string;
  organizationName: string;
  inviterName: string;
};

type PageState =
  | { step: "loading" }
  | { step: "accepting" }
  | { step: "form"; mode: "login" | "register"; invitation: InvitationData }
  | { step: "success"; organizationId: string }
  | { step: "rejected" }
  | { step: "error"; message: string };

const AcceptInvitation = ({ action }: { action: "accept" | "reject" }) => {
  const { token, email, orgName, inviter } = useSearch({
    from: "/invitation/$action",
  }) as any;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PageState>({ step: "loading" });

  const acceptAndRedirect = async () => {
    setState({ step: "accepting" });
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const { data: acceptData, error } =
        await authClient.organization.acceptInvitation({
          invitationId: token,
        });

      if (error) throw new Error(error.message);

      const organizationId = acceptData?.member?.organizationId;
      if (organizationId) {
        await authClient.organization.setActive({ organizationId });
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        setState({ step: "success", organizationId });
      } else {
        setState({ step: "success", organizationId: "" });
      }
    } catch (err: any) {
      setState({
        step: "error",
        message: err.message || "Failed to accept invitation.",
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData } = await authClient.getSession();
        if (sessionData?.user) {
          if (email && sessionData.user.email !== email) {
            setState({
              step: "error",
              message: `This invite is for ${email}, but you are signed in as ${sessionData.user.email}.`,
            });
            return;
          }
          if (action === "reject") {
            await authClient.organization.rejectInvitation({
              invitationId: token,
            });
            setState({ step: "rejected" });
            return;
          }
          await acceptAndRedirect();
          return;
        }
        if (action === "reject") {
          navigate({ to: "/login" });
          return;
        }
        setState({
          step: "form",
          mode: "login",
          invitation: {
            email: email || "",
            organizationName: orgName || "the team",
            inviterName: inviter || "A colleague",
          },
        });
      } catch (err: any) {
        setState({
          step: "error",
          message: "Initialization failed. Please try again.",
        });
      }
    };
    init();
  }, [token, action]);

  // --- UI States ---

  if (state.step === "loading" || state.step === "accepting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 border-4 border-primary/20 rounded-full" />
          <Loader2
            className="w-16 h-16 animate-spin text-primary"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="mt-8 text-xl font-medium text-slate-900">
          {state.step === "accepting"
            ? "Finalizing your access..."
            : "Checking invitation..."}
        </h2>
        <p className="mt-2 text-slate-500">This will only take a moment.</p>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md border-destructive/20 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Something went wrong</CardTitle>
            <CardDescription className="mt-2">{state.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate({ to: "/login" })}
              className="w-full"
              variant="outline"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.step === "success") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              You're in!
            </CardTitle>
            <CardDescription className="text-base">
              Your invitation has been accepted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Button
              onClick={() =>
                navigate({
                  to: state.organizationId ? "/$team" : "/login",
                  params: state.organizationId
                    ? { team: state.organizationId }
                    : undefined,
                })
              }
              className="w-full h-12 text-lg group"
            >
              Enter Dashboard
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only render the form step if in "form", ensure type safety (fixes lint error)
  if (state.step === "form") {
    const { invitation, mode } = state;

    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-slate-200">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Join the team
            </CardTitle>
            <CardDescription className="text-slate-500 text-base">
              <span className="font-semibold text-slate-900">
                {invitation.inviterName}
              </span>{" "}
              has invited you to join{" "}
              <span className="font-semibold text-slate-900">
                {invitation.organizationName}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-3 mb-6 flex items-center gap-3 border border-slate-100">
              <Mail className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                {invitation.email || "Your Email"}
              </span>
            </div>

            {mode === "login" ? (
              <LoginForm
                email={invitation.email}
                onSuccess={acceptAndRedirect}
              />
            ) : (
              <RegisterForm
                email={invitation.email}
                token={token}
                onSuccess={acceptAndRedirect}
                onSwitchToLogin={() =>
                  setState((s) =>
                    s.step === "form" ? { ...s, mode: "login" } : s
                  )
                }
              />
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                {mode === "login"
                  ? "Don't have an account yet?"
                  : "Already have an account?"}
                <button
                  className="ml-2 font-semibold text-primary hover:underline"
                  onClick={() =>
                    setState((s) =>
                      s.step === "form"
                        ? {
                            ...s,
                            mode: s.mode === "login" ? "register" : "login",
                          }
                        : s
                    )
                  }
                >
                  {mode === "login" ? "Create one now" : "Sign in here"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Form Components with Icons ---

  function LoginForm({
    email: initialEmail,
    onSuccess,
  }: {
    email: string;
    onSuccess: () => Promise<void>;
  }) {
    const form = useForm({
      resolver: zodResolver(
        z.object({ email: z.string().email(), password: z.string().min(8) })
      ),
      defaultValues: { email: initialEmail, password: "" },
    });

    const onSubmit = async (values: any) => {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await onSuccess();
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!initialEmail && (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="name@company.com"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            className="w-full h-11"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Authenticating..."
              : "Sign In & Accept"}
          </Button>
        </form>
      </Form>
    );
  }

  function RegisterForm({
    email: initialEmail,
    token,
    onSuccess,
    onSwitchToLogin,
  }: any) {
    const form = useForm({
      resolver: zodResolver(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(8),
        })
      ),
      defaultValues: { name: "", email: initialEmail, password: "" },
    });

    const onSubmit = async (values: any) => {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      });
      if (error) {
        if (error.code === "USER_ALREADY_EXISTS") {
          toast.info("User exists, switching to login.");
          onSwitchToLogin();
          return;
        }
        toast.error(error.message);
        return;
      }
      try {
        await verifyInviteEmail(token);
        await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });
        await onSuccess();
      } catch (e) {
        onSwitchToLogin();
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="John Doe"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="name@company.com"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Create Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <Button
            className="w-full h-11"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Creating account..."
              : "Register & Join"}
          </Button>
        </form>
      </Form>
    );
  }
};

export default AcceptInvitation;
