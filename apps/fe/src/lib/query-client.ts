import { QueryClient } from "@tanstack/react-query";

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
