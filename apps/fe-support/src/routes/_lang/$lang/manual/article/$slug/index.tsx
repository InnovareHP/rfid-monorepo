import { ArticlePage } from "@/components/KnowledgeBase/ArticlePage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/manual/article/$slug/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ArticlePage />;
}
