import { NotificationsPage } from "@/components/notification/notifications-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/notifications")({
  component: NotificationsPage,
  errorComponent: () => (
    <p className="p-6 text-sm text-muted-foreground">
      Notifications could not be loaded.
    </p>
  ),
});
