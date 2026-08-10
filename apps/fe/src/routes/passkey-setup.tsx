import { PasskeySetupPage } from "@/components/passkeys/passkey-setup-page";
import { getPasskeyPrompt } from "@/services/passkeys/passkeys-service";
import {
  createFileRoute,
  redirect,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import type { Session, User } from "better-auth";

type RouteContext = {
  user: User | null;
  session: (Session & { activeOrganizationId?: string }) | null;
};

// Where the user was heading before the offer. Onboarding owns the case where
// there is no organization yet.
const onward = (activeOrganizationId?: string) =>
  activeOrganizationId
    ? ({ to: "/$team", params: { team: activeOrganizationId } } as const)
    : ({ to: "/onboarding" } as const);

export const Route = createFileRoute("/passkey-setup")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const { user, session } = context as RouteContext;

    if (!user) throw redirect({ to: "/login" });

    // A user who already has a passkey, or who declined once, never sees this.
    const { shouldPrompt } = await getPasskeyPrompt();
    if (!shouldPrompt) {
      throw redirect({ ...onward(session?.activeOrganizationId), replace: true });
    }
  },
});

function RouteComponent() {
  const router = useRouter();
  const { session } = useRouteContext({ from: "__root__" }) as RouteContext;

  return (
    <PasskeySetupPage
      onDone={() =>
        router.navigate({
          ...onward(session?.activeOrganizationId),
          replace: true,
        })
      }
    />
  );
}
