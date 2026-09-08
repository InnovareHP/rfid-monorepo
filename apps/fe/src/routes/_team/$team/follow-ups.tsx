import { FollowUpPage } from "@/components/follow-up/follow-up-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/follow-ups")({
  component: FollowUpPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Follow-ups could not be loaded.</p>
    </div>
  ),
});
