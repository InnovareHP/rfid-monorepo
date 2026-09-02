import { ManualIndexPage } from "@/components/KnowledgeBase/ManualIndexPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/manual/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ManualIndexPage />;
}
