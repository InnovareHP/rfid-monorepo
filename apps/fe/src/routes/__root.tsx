import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@dashboard/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";

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
