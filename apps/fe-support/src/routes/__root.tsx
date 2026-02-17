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

function RootErrorComponent({ error }: { error: Error }) {
  const isNetworkError =
    error?.message?.includes("fetch") ||
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("NetworkError");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">
        {isNetworkError ? "Unable to connect" : "Something went wrong"}
      </h1>
      <p className="max-w-sm text-sm text-gray-600">
        {isNetworkError
          ? "The server may be unavailable. Check that the API is running and try again."
          : error?.message ?? "An unexpected error occurred."}
      </p>
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    try {
      const { data: session } = await authClient.getSession();
      return session;
    } catch {
      // API down or network error: continue without session so the app still loads
      return null;
    }
  },
  component: App,
  errorComponent: RootErrorComponent,
});
