import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import type {
  Organization,
  SessionMember,
  Subscription,
} from "@dashboard/shared";
import {
  adminClient,
  customSessionClient,
  oneTimeTokenClient,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Session, User } from "better-auth";
import { ac, admin, liaison, member, owner } from "./permissions";
import { queryClient } from "./query-client";

type EnrichedSession = {
  user: User & { isOnboarded: boolean };
  session: Session & { activeOrganizationId: string | null };
  member: SessionMember | null;
  organization: Organization | null;
  subscription: Subscription | null;
};

type CustomSessionServer = {
  options: {
    plugins: {
      id: "custom-session";
      $Infer: { Session: EnrichedSession };
    }[];
  };
};

export const authClient = createAuthClient({
  plugins: [
    passkeyClient(),
    stripeClient({
      subscription: true,
    }),
    adminClient(),
    oneTimeTokenClient(),
    organizationClient({
      ac,
      roles: {
        owner,
        admin,
        liason: liaison,
        member,
      },
    }),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/two-factor";
      },
    }),
    customSessionClient<CustomSessionServer>(),
  ],
  additionalFields: {
    user_is_onboarded: {
      type: "boolean",
      defaultValue: false,
    },
  },
});

// The root loader builds its context from the cached ["session"] query, so a
// router.invalidate() alone rebuilds it from stale data. Server cookie cache is
// bypassed too, or a just-changed flag like twoFactorEnabled reads 60s old.
export const refreshSessionCache = async () => {
  const { data } = await authClient.getSession({
    query: { disableCookieCache: true },
  });
  queryClient.setQueryData(["session"], data);
  return data;
};

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  refreshToken,
  useActiveMember,
  useActiveOrganization,
} = authClient;
