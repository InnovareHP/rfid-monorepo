import { LoginForm } from "@/components/login-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/login")({
  component: LoginComponent,
});

function LoginComponent() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-0 lg:p-10">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  );
}
