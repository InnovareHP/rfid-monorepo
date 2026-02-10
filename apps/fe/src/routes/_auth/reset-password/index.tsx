import { ResetPasswordForm } from "@/components/reset-password-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/reset-password/")({
  component: ResetPasswordComponent,
});

function ResetPasswordComponent() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
