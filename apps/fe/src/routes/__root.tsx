import { Toaster } from "@dashboard/ui/components/sonner";
import { authClient } from "@/lib/auth-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";

const queryClient = new QueryClient();

function App() {
  return (
    // Provide the client to your App
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
    const { data } = await authClient.getSession();

    return {
      user: data?.user || null,
      session: data?.session || null,
    };
  },
  component: () => (
    <>
      <App />
      {/* <TanstackDevtools
        config={{
          position: "bottom-left",
        }}
      /> */}
    </>
  ),
});
