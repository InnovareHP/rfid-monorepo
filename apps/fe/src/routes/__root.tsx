import ImpersonationBanner from "@/components/impersonatedBanner/impersonatedBanner";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@dashboard/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRoute,
  useRouteContext,
} from "@tanstack/react-router";

function App() {
  const { session } = useRouteContext({ from: "__root__" }) as {
    session: { impersonatedBy: string | null };
  };
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        {session?.impersonatedBy && <ImpersonationBanner />}
        <Outlet />
      </main>
      <Toaster />
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    const data = await queryClient.fetchQuery({
      queryKey: ["session"],
      queryFn: () => authClient.getSession().then((r) => r.data),
    });

    return {
      user: data?.user ?? null,
      session: data?.session ?? null,
    };
  },
  component: App,
});
