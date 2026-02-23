import { ActivityLogPage } from "@/components/AdminDashboard/ActivityLogPage/ActivityLogPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/activity-log")({
  component: ActivityLogPage,
});
