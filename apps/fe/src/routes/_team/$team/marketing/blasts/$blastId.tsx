import { BlastEditorPage } from "@/components/marketing/blasts/blast-editor-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/blasts/$blastId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BlastEditorPage />;
}
