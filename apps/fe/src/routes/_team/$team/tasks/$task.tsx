import TaskDetail from "@/components/task/task-detail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/tasks/$task")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TaskDetail />;
}
