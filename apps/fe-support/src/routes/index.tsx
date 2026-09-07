import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    throw redirect({ to: "/$lang", params: { lang: "en" } });
  },
  component: () => null,
});
