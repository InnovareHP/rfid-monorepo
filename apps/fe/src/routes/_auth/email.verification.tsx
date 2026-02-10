import { Card, CardContent, CardHeader, CardTitle } from "@dashboard/ui/components/card";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/email/verification")({
  component: RouteComponent,
});

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
      } catch (err) {
        setStatus("error");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <Card className="w-full max-w-md shadow-xl border border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Email Verification
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center py-6 space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-gray-600 text-sm">
                Verifying your email, please wait...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-gray-700 text-center text-sm">
                Your email has been verified successfully.
              </p>

              <Link
                to="/login"
                className="w-full px-4 py-2 text-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-gray-700 text-center text-sm">
                Invalid or expired verification link.
              </p>

              <Link
                to="/login"
                className="w-full px-4 py-2 text-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Go to Login
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
