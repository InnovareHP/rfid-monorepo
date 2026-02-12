import { authClient } from "@/lib/auth-client";
import { Toaster } from "@dashboard/ui/components/sonner";
import { Outlet, createRootRoute } from "@tanstack/react-router";

function App() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <Toaster />
    </>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession();
      return {
        session: session.data?.session ?? null,
        user: session.data?.user ?? null,
      };
    } catch {
      // API unreachable (e.g. not running); app still loads without session
      return { session: null, user: null };
    }
  },
  component: App,
});
