import { NotFoundPage } from "@/components/error-page/not-found-page";
import { ServerErrorPage } from "@/components/error-page/server-error-page";
import ImpersonationBanner from "@/components/impersonatedBanner/impersonatedBanner";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@dashboard/ui/components/sonner";
import type { SessionMember, Subscription } from "@dashboard/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRoute,
  useRouteContext,
} from "@tanstack/react-router";
import type { Session, User } from "better-auth";

type SessionData = {
  user: User | null;
  session:
    | (Session & { impersonatedBy: string | null; activeOrganizationId: string })
    | null;
  member: SessionMember | null;
  organization: { id: string } | null;
  subscription: Subscription | null;
} | null;

function App() {
  const { session } = useRouteContext({ from: "__root__" }) as {
    session: { impersonatedBy: string | null };
  };
  return (
    <QueryClientProvider client={queryClient}>
      <main className="h-full">
        {session?.impersonatedBy && <ImpersonationBanner />}
        <Outlet />
      </main>
      {/* Explicit duration rather than sonner's implicit default, plus a
          manual dismiss for the case where its timer is paused. */}
      <Toaster duration={4000} closeButton />
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    const sessionQuery = {
      queryKey: ["session"],
      queryFn: async () => {
        const { data, error } = await authClient.getSession();

        // No session is data: null with no error. A transport failure, a 429
        // or a 5xx must not read as signed out, or the team guard sends a
        // still-authenticated user to /login.
        if (error && error.status !== 401) {
          throw new Error(error.message ?? "Failed to load session");
        }

        return data as SessionData;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    };

    // Awaiting a stale session here put the root match in pending and blanked the whole tree.
    const cached = queryClient.getQueryData<SessionData>(["session"]);
    if (cached) queryClient.prefetchQuery(sessionQuery);

    const data = cached ?? (await queryClient.ensureQueryData(sessionQuery));

    return {
      user: data?.user ?? null,
      session: data?.session ?? null,
      member: data?.member ?? null,
      organization: data?.organization ?? null,
      subscription: data?.subscription ?? null,
      activeOrganizationId: data?.organization?.id ?? null,
    };
  },
  component: App,
  errorComponent: ({ reset }) => <ServerErrorPage reset={reset} />,
  notFoundComponent: NotFoundPage,
});
