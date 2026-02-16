import { authClient } from "@/lib/auth-client";
import { Toaster } from "@dashboard/ui/components/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <Outlet />
      </main>
      <Toaster />
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    return session;
  },
  // Session is not needed for initial render; components that need it (e.g. SupportChat) use useSession().
  // Avoiding async beforeLoad here prevents blocking the first paint on a slow/unreachable API.
  component: App,
});
