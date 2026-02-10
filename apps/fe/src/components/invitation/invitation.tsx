import { authClient } from "@/lib/auth-client";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const AcceptInvitation = ({ action }: { action: "accept" | "reject" }) => {
  const { token } = useSearch({ from: "/invitation/$action" }) as {
    token: string;
  };
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const handleInvite = async () => {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        if (action === "accept") {
          await authClient.organization.acceptInvitation({
            invitationId: token,
          });
        } else {
          await authClient.organization.rejectInvitation({
            invitationId: token,
          });
        }
        setStatus("success");
      } catch (err) {
        console.error("Failed to process invitation:", err);
        setStatus("error");
      }
    };

    handleInvite();
  }, [token, action]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">
          {action === "accept" ? "Accepting" : "Rejecting"} invitation...
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
        <p>Invalid or expired invitation.</p>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="mt-4 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          Go back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-green-600">
      <p>
        Invitation {action === "accept" ? "accepted" : "rejected"} successfully!
      </p>
      <button
        onClick={() => navigate({ to: "/login" })}
        className="mt-4 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700"
      >
        {action === "accept" ? "Go to Dashboard" : "Go to Login"}
      </button>
    </div>
  );
};

export default AcceptInvitation;
