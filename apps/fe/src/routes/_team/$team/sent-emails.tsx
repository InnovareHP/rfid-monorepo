import { SentEmailsPage } from "@/components/sent-emails/sent-emails-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/sent-emails")({
  component: SentEmailsPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Sent emails could not be loaded.</p>
    </div>
  ),
});
