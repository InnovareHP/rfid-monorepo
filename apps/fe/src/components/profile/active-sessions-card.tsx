import { authClient } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "./section-card";

export type SessionRow = {
  id: string;
  token: string;
  createdAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type ActiveSessionsCardProps = {
  sessions: SessionRow[];
  isLoading?: boolean;
  currentSessionToken?: string;
  onSignOut: () => void;
};

function describeUserAgent(userAgent?: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = /edg/i.test(userAgent)
    ? "Edge"
    : /chrome|crios/i.test(userAgent)
      ? "Chrome"
      : /firefox|fxios/i.test(userAgent)
        ? "Firefox"
        : /safari/i.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /windows/i.test(userAgent)
    ? "Windows"
    : /iphone|ipad/i.test(userAgent)
      ? "iOS"
      : /android/i.test(userAgent)
        ? "Android"
        : /mac os/i.test(userAgent)
          ? "macOS"
          : /linux/i.test(userAgent)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${os}`;
}

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export function ActiveSessionsCard({
  sessions,
  isLoading,
  currentSessionToken,
  onSignOut,
}: ActiveSessionsCardProps) {
  const queryClient = useQueryClient();

  const revokeSessionMutation = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authClient.revokeSession({ token });
      if (error) throw new Error(error.message ?? "Failed to revoke session");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-sessions"] });
      toast.success("Session revoked");
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error(error.message ?? "Failed to revoke sessions");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-sessions"] });
      toast.success("Signed out of all other devices");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <SectionCard
      title="Active Sessions"
      description="Devices currently signed in to your account."
      action={
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={revokeOthersMutation.isPending || sessions.length <= 1}
          onClick={() => revokeOthersMutation.mutate()}
        >
          {revokeOthersMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 size-4" />
          )}
          Sign out other devices
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading sessions...
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isCurrent = session.token === currentSessionToken;
            return (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2C86D9] text-white">
                    <MonitorSmartphone className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {describeUserAgent(session.userAgent)}
                      </p>
                      {isCurrent && (
                        <span className="rounded-full border border-success px-2 py-0.5 text-xs font-medium text-success">
                          This Device
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {session.ipAddress || "Unknown IP"} · Signed in{" "}
                      {formatDate(session.createdAt)}
                    </p>
                  </div>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={revokeSessionMutation.isPending}
                    onClick={() => revokeSessionMutation.mutate(session.token)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              No active sessions found.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 size-4" />
          Sign Out
        </Button>
      </div>
    </SectionCard>
  );
}
