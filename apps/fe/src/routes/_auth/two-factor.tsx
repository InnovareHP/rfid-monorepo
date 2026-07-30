import { TwoFactorVerify } from "@/components/two-factor/two-factor-verify";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/two-factor")({
  component: TwoFactorComponent,
});

function TwoFactorComponent() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-4">
      <TwoFactorVerify />
    </div>
  );
}
