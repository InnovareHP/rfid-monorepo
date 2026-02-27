import { stripeClient } from "@better-auth/stripe/client";
import {
  adminClient,
  oneTimeTokenClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admission_manager, liason, owner } from "./permissions";

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
        liason,
        admission_manager,
      },
    }),
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
