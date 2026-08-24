import { authClient } from "@/lib/auth-client";
import {
  completeSignup,
  getInvitationContext,
  getInvitationPreview,
} from "@/services/passkeys/passkeys-service";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { getApiErrorMessage } from "@/lib/helper/helper";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  passwordRegisterSchema,
  RegisterSection,
} from "./register-section";
import { passwordSignInSchema, SignInSection } from "./sign-in-section";

type InvitationData = {
  email: string;
  organizationName: string;
  inviterName: string;
};

type PageState =
  | { step: "loading" }
  | { step: "accepting" }
  // Email already has an account: sign in with a password or a passkey.
  | { step: "sign-in"; invitation: InvitationData }
  // Email has no account yet: register with a password or a passkey.
  | { step: "register"; invitation: InvitationData; context: string }
  | { step: "success"; organizationId: string }
  | { step: "rejected" }
  | { step: "error"; message: string };


const AcceptInvitation = ({ action }: { action: "accept" | "reject" }) => {
  const { token, email, orgName, inviter } = useSearch({
    from: "/invitation/$action",
  });
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
    } catch (err) {
      setState({
        step: "error",
        message: getApiErrorMessage(err, "Failed to accept invitation."),
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      // A link without a token cannot identify an invitation, so say so rather
      // than sending undefined to the API and surfacing its generic failure.
      if (!token) {
        setState({
          step: "error",
          message:
            "This invitation link is incomplete. Ask your organization owner to send a new one.",
        });
        return;
      }
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

        try {
          // The invite link carries only the token, so who it is for comes from
          // the API rather than the URL. hasAccount picks the branch directly
          // instead of string-matching an error message.
          const preview = await getInvitationPreview(token);
          const invitation: InvitationData = {
            email: preview.email,
            organizationName: preview.organizationName || orgName || "the team",
            inviterName: preview.inviterName || inviter || "A colleague",
          };

          if (preview.hasAccount) {
            setState({ step: "sign-in", invitation });
            return;
          }

          const grant = await getInvitationContext(token);
          setState({
            step: "register",
            invitation: { ...invitation, email: grant.email },
            context: grant.context,
          });
        } catch (previewError) {
          // The API nests its body under `message`, so this must go through
          // getApiErrorMessage -- reading data.message directly yields an
          // object, not a string.
          setState({
            step: "error",
            message: getApiErrorMessage(
              previewError,
              "This invitation is no longer valid."
            ),
          });
        }
      } catch {
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

  const handlePasswordSignIn = async (
    values: z.infer<typeof passwordSignInSchema>
  ) => {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast.error(error.message ?? "Could not sign in.");
      return;
    }
    await acceptAndRedirect();
  };

  // Holding a valid invitation already proves mailbox control, so no code is
  // emailed — the invitation id buys the enrollment grant directly.
  const handleEnrollAndJoin = async (context: string) => {
    setPending(true);
    try {
      const { error } = await authClient.passkey.addPasskey({ context });
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

  const handlePasswordRegister = async (
    values: z.infer<typeof passwordRegisterSchema>,
    context: string,
    invitationEmail: string
  ) => {
    try {
      await completeSignup(context, values.password);

      const { error } = await authClient.signIn.email({
        email: invitationEmail,
        password: values.password,
      });
      if (error) {
        toast.success("Account created. Sign in to finish joining.");
        return;
      }
      await acceptAndRedirect();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create your account. Start again."
      );
    }
  };

  // --- UI States ---

  if (state.step === "loading" || state.step === "accepting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 border-4 border-primary/20 rounded-full" />
          <Spinner className="w-16 h-16 text-primary" />
        </div>
        <h2 className="mt-8 text-xl font-medium text-foreground">
          {state.step === "accepting"
            ? "Finalizing your access..."
            : "Checking invitation..."}
        </h2>
        <p className="mt-2 text-muted-foreground">
          This will only take a moment.
        </p>
      </div>
    );
  }

  if (state.step === "rejected") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
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
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
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
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
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
    <div className="flex items-center justify-center min-h-screen p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-border">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Join the team
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            <span className="font-semibold text-foreground">
              {invitation.inviterName}
            </span>{" "}
            has invited you to join{" "}
            <span className="font-semibold text-foreground">
              {invitation.organizationName}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-3 mb-6 flex items-center gap-3 border border-border">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {invitation.email || "Your Email"}
            </span>
          </div>

          {state.step === "sign-in" ? (
            <SignInSection
              email={invitation.email}
              pending={pending}
              onPasswordSignIn={handlePasswordSignIn}
              onPasskeySignIn={handleSignInWithPasskey}
            />
          ) : (
            <RegisterSection
              pending={pending}
              onPasswordRegister={(values) =>
                handlePasswordRegister(values, state.context, invitation.email)
              }
              onPasskeyRegister={() => handleEnrollAndJoin(state.context)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
