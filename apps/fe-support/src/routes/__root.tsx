import { Toaster } from "@dashboard/ui/components/sonner";
import { Outlet, createRootRoute } from "@tanstack/react-router";

function RootLayout() {
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
  component: RootLayout,
});
