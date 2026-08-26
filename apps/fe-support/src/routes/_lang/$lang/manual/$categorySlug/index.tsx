import { CategoryPage } from "@/components/KnowledgeBase/CategoryPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/manual/$categorySlug/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CategoryPage />;
}
