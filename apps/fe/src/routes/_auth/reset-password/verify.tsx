import { ResetPasswordVerifyForm } from "@/components/reset-password-verify";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/reset-password/verify")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <ResetPasswordVerifyForm />
      </div>
    </div>
  );
}
