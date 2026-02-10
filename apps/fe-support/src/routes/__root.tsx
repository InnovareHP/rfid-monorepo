import { authClient } from "@/lib/auth-client";
import { Toaster } from "@dashboard/ui/components/sonner";
import { Outlet, createRootRoute } from "@tanstack/react-router";

function App() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <Toaster />s
    </>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    console.log(session);
    return {
      session: session.data?.session,
      user: session.data?.user,
    };
  },
  component: App,
});
