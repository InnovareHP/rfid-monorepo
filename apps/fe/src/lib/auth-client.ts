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
import { ac, admission_manager, liaison, owner } from "./permissions";

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
    stripeClient({
      subscription: true,
    }),
    adminClient(),
    oneTimeTokenClient(),
    organizationClient({
      ac,
      roles: {
        owner,
        liason: liaison,
        admission_manager,
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
