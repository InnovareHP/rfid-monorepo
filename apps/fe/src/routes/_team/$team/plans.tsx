import { PlansPage } from "@/components/plans-page";
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_team/$team/plans')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PlansPage />
}

