import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Spinner } from "@dashboard/ui/components/spinner";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/email/verification")({
  component: RouteComponent,
  errorComponent: VerificationError,
});

function VerificationError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-xl border border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 space-y-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground text-center text-sm">
            We could not load this page. Try the link again from your email.
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
  const { token } = useSearch({ from: "/_auth/email/verification" }) as {
    token: string;
  };

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const { error } = await authClient.verifyEmail({
          query: {
            token,
          },
        });

        if (error) {
          toast.error(error.message);
          return setStatus("error");
        }

        toast.success("Email verified successfully.");
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-xl border border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Email Verification
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center py-6 space-y-4">
          {status === "loading" && (
            <>
              <Spinner className="h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                Verifying your email, please wait...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="text-muted-foreground text-center text-sm">
                Your email has been verified successfully.
              </p>

              <Button asChild className="w-full">
                <Link to="/login">Go to Login</Link>
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground text-center text-sm">
                Invalid or expired verification link.
              </p>

              <Button asChild className="w-full">
                <Link to="/login">Go to Login</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
