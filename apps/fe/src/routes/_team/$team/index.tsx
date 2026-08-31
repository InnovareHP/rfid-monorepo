import { createFileRoute, redirect } from "@tanstack/react-router";

// The organization root is the referral analytics page, which lives on the
// referral module's analytics route rather than under its own path.
export const Route = createFileRoute("/_team/$team/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$team/records/$moduleKey/analytics",
      params: { team: params.team, moduleKey: "referral" },
      replace: true,
    });
  },
});
