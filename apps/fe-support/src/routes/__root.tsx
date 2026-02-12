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
  // Session is not needed for initial render; components that need it (e.g. SupportChat) use useSession().
  // Avoiding async beforeLoad here prevents blocking the first paint on a slow/unreachable API.
  component: App,
});
