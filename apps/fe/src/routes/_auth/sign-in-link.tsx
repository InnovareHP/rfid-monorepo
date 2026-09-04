import { authClient } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Spinner } from "@dashboard/ui/components/spinner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/_auth/sign-in-link")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: String(search.token ?? ""),
  }),
  // The token is single use, so it is redeemed once here rather than in an
  // effect that a remount would fire twice.
  loader: async ({ location }) => {
    const { token } = location.search as { token: string };
    if (!token) throw new Error("Missing token");

    const { error } = await authClient.$fetch("/admin-sign-in-link/verify", {
      method: "POST",
      body: { token },
    });

    if (error) throw new Error(error.message ?? "Could not sign you in");

    // Full load rather than a router navigation: the session cookie is new, and
    // every cached query was built without one.
    window.location.replace("/");
  },
  component: RouteComponent,
  errorComponent: SignInLinkError,
});

function SignInLinkError() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-xl border border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            This link cannot be used
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 space-y-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground text-center text-sm">
            Sign-in links last 10 minutes and work once. Ask support for a new
            one, or sign in with your passkey.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RouteComponent() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-muted/30 px-4">
      <Spinner />
    </div>
  );
}
