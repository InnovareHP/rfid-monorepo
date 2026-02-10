import AcceptInvitation from "@/components/invitation/invitation";
import {
    createFileRoute,
    notFound,
    useParams,
} from "@tanstack/react-router";

export const Route = createFileRoute("/invitation/$action")({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    const { action } = params;
    if (!["accept", "reject"].includes(action)) {
      throw notFound();
    }
  },
});

function RouteComponent() {
  const { action } = useParams({ from: "/invitation/$action" }) as {
    action: "accept" | "reject";
  };
  return <AcceptInvitation action={action} />;
}
