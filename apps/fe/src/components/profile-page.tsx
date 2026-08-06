import { PageHeader } from "@/components/PageHeader";
import { authClient } from "@/lib/auth-client";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import type { User as BetterAuthUser } from "better-auth";
import type { Member } from "better-auth/plugins/organization";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { SessionRow } from "./profile/active-sessions-card";
import { ProfileTab } from "./profile/profile-tab";
import { SecurityTab } from "./profile/security-tab";

interface RouteContext {
  user: BetterAuthUser & {
    role?: string;
    twoFactorEnabled?: boolean;
    createdAt?: string | Date;
  };
  memberData: Member & { createdAt?: string | Date; role?: string };
}

const tabTriggerClass =
  "flex-none gap-2 rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-brand data-[state=active]:text-white data-[state=inactive]:text-muted-foreground";

export function ProfilePage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { user, memberData } = useRouteContext({
    from: "__root__",
  }) as RouteContext;

  const router = useRouter();
  const { data: sessionData } = authClient.useSession();

  const sessionsQuery = useQuery({
    queryKey: ["profile-sessions"],
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error) throw new Error(error.message ?? "Failed to load sessions");
      return data ?? [];
    },
  });

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.navigate({ to: "/login" });
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="size-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Error Loading Profile
              </h3>
              <p className="mt-1 text-red-700">Could not load user profile.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const twoFactorEnabled = user.twoFactorEnabled === true;
  const memberSince = memberData?.createdAt ?? user?.createdAt;
  const sessions = (sessionsQuery.data ?? []) as SessionRow[];

  return (
    <div
      className={cn("min-h-screen w-full bg-gray-50 p-6 sm:p-8", className)}
      {...props}
    >
      <div className="space-y-6">
        <PageHeader
        title="Account Settings"
        description="Manage your account, security, and active sessions."
      />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="h-auto w-fit gap-1 self-start rounded-lg bg-table-header p-1.5">
            <TabsTrigger value="profile" className={tabTriggerClass}>
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className={tabTriggerClass}>
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileTab
              name={user.name}
              email={user.email}
              image={user.image}
              emailVerified={user.emailVerified}
              twoFactorEnabled={twoFactorEnabled}
              memberSince={memberSince}
              sessionCount={sessions.length}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab
              twoFactorEnabled={twoFactorEnabled}
              sessions={sessions}
              isLoadingSessions={sessionsQuery.isLoading}
              currentSessionToken={sessionData?.session?.token}
              onSignOut={handleSignOut}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
