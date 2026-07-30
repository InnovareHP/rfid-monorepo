import { authClient } from "@/lib/auth-client";
import { getInvitationContext } from "@/services/passkeys/passkeys-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Loader2,
  Mail,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InvitationData = {
  email: string;
  organizationName: string;
  inviterName: string;
};

type PageState =
  | { step: "loading" }
  | { step: "accepting" }
  | { step: "form"; invitation: InvitationData }
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
  const [pending, setPending] = useState(false);

  const acceptAndRedirect = async () => {
    setState({ step: "accepting" });
    try {
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

  const handleSignInWithPasskey = async () => {
    setPending(true);
    const { error } = await authClient.signIn.passkey();
    setPending(false);

    if (error) {
      toast.error(error.message ?? "Could not sign in with a passkey.");
      return;
    }
    await acceptAndRedirect();
  };

  // Holding a valid invitation already proves mailbox control, so no code is
  // emailed — the invitation id buys the enrollment grant directly.
  const handleEnrollAndJoin = async () => {
    setPending(true);
    try {
      const grant = await getInvitationContext(token);
      const { error } = await authClient.passkey.addPasskey({
        context: grant.context,
      });
      if (error) {
        toast.error(error.message ?? "Could not register your passkey.");
        return;
      }

      const { error: signInError } = await authClient.signIn.passkey();
      if (signInError) {
        toast.error("Passkey registered. Sign in to finish joining.");
        return;
      }
      await acceptAndRedirect();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "This invitation is no longer valid."
      );
    } finally {
      setPending(false);
    }
  };

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

  if (state.step === "rejected") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-none">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invitation declined</CardTitle>
            <CardDescription className="mt-2">
              You can close this page.
            </CardDescription>
          </CardHeader>
        </Card>
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

  const { invitation } = state;

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

          <div className="space-y-3">
            <Button
              className="w-full h-11"
              disabled={pending}
              onClick={handleEnrollAndJoin}
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Fingerprint className="mr-2 w-4 h-4" />
                  Create a passkey and join
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-11"
              disabled={pending}
              onClick={handleSignInWithPasskey}
            >
              I already have a passkey
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Passkeys stay on your device and are unlocked with your fingerprint,
            face, or device PIN. There is no password to set.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
