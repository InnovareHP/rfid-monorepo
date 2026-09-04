import { RoutePending } from "@/components/Reusable/RoutePending";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  // Covers every route at once, including the code-split chunk fetch.
  // Strictly additive: pendingMinMs holds content back once the spinner is up,
  // so it is 0 here. The spinner only appears on a load already past 700ms and
  // never delays one.
  defaultPendingComponent: RoutePending,
  defaultPendingMs: 700,
  defaultPendingMinMs: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}

// test
