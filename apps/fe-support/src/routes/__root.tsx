import { ImpersonationBanner } from "@/components/AdminDashboard/UserManagementPage/ImpersonationBanner";
import { getSession } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { LOGO_ALT_TEXT } from "@dashboard/shared";
import { Toaster } from "@dashboard/ui/components/sonner";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";

const sessionQueryOptions = {
  queryKey: ["session"],
  queryFn: async () => {
    const { data } = await getSession();
    return data;
  },
  staleTime: 1000 * 60 * 5, // 5 minutes
};

function ImpersonationBannerWrapper() {
  const { data: session } = useQuery(sessionQueryOptions);

  const impersonatedBy = (
    session?.session as { impersonatedBy?: string } | undefined
  )?.impersonatedBy;

  if (!impersonatedBy || !session?.user) return null;

  return <ImpersonationBanner userName={session.user.name} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ImpersonationBannerWrapper />
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
      <img
        src="/branding/Full/refidly-full-colored.png"
        alt={LOGO_ALT_TEXT}
        className="h-10 w-auto object-contain"
      />
      <h1 className="page-title text-xl font-semibold">
        {isNetworkError ? "Unable to connect" : "Something went wrong"}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {isNetworkError
          ? "The server may be unavailable. Check that the API is running and try again."
          : (error?.message ?? "An unexpected error occurred.")}
      </p>
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    try {
      const session = await queryClient.fetchQuery(sessionQueryOptions);
      return session;
    } catch {
      return null;
    }
  },
  component: App,
  errorComponent: RootErrorComponent,
});
