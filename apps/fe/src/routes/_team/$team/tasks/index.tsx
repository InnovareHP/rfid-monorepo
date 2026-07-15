import TaskPage from "@/components/task/task-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/tasks/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TaskPage />;
}
