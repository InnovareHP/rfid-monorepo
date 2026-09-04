import { RoutePending } from "@/components/route-pending";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";


// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import reportWebVitals from "./reportWebVitals.ts";
import "./styles.css";

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  // Zero made every hover-preload stale on arrival, so beforeLoad ran twice per navigation.
  defaultPreloadStaleTime: 30_000,
  // Covers every route at once, including the code-split chunk fetch, which is
  // what used to leave the previous screen frozen with no feedback.
  // Strictly additive: pendingMinMs holds content back once the spinner is up,
  // so it is 0 here and content paints the instant it is ready. The spinner can
  // only ever appear on a load already past 700ms, and it never delays one.
  // The cost is a brief flash for a load landing just over the threshold, which
  // is the better trade against adding latency to a navigation that was fine.
  defaultPendingComponent: RoutePending,
  defaultPendingMs: 700,
  defaultPendingMinMs: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
