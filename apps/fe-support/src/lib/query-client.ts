import { QueryClient } from "@tanstack/react-query";

// Bare defaults are staleTime 0 with refetchOnWindowFocus on, which refetched
// every admin table on each mount and on every return to the tab. Mirrors the
// dashboard's client so both apps behave the same.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Default gcTime matches staleTime, so leaving a page for six minutes
      // dropped its data and every return trip refetched from scratch.
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
