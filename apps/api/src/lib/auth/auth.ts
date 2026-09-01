import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import {
  admin,
  customSession,
  oneTimeToken,
  openAPI,
  organization,
  twoFactor,
} from "better-auth/plugins";
import { appConfig } from "../../config/app-config";
import { prisma } from "../prisma/prisma";
import { redis } from "../redis/redis";
import { BETTER_AUTH_PLANS } from "../stripe/plans";
import { stripe as stripeClient } from "../stripe/stripe";
import { StripeHelper } from "../stripe/stripe-events";
import { TAX_CHECKOUT_BASE } from "../stripe/stripe-tax";
import { persistSubscriptionPaymentSettings } from "../stripe/subscription-payment-settings";
import {
  auditAdminActions,
  requireImpersonationReason,
} from "./admin-audit-hook";
import { invalidateSessionContextAfterMembershipChange } from "./session-context-hook";
import {
  afterAcceptInvitation,
  afterAddMember,
  afterCancelInvitation,
  afterCreateOrganization,
  afterDeleteOrganization,
  afterRejectInvitation,
  afterRemoveMember,
  afterUpdateMemberRole,
  beforeAcceptInvitation,
  beforeAddMember,
  beforeCreateInvitation,
  beforeCreateOrganization,
  beforeCreateTeam,
  beforeDeleteOrganization,
  beforeRemoveMember,
  beforeSessionCreate,
  beforeSessionUpdate,
  beforeUpdateMemberRole,
  beforeUpdateOrganization,
  beforeUpdateTeam,
  customSessionHandler,
  onPasswordReset,
  sendInvitationEmail,
  sendResetPassword,
  sendTwoFactorOtp,
  sendVerificationEmail,
  stripeAuthorizeReference,
  subscriptionAuthorizeReference,
} from "./auth-helper";
import {
  afterPasskeyAuthentication,
  afterPasskeyRegistration,
  resolvePasskeyRegistrationUser,
} from "./passkey-hooks";
import {
  ac,
  member,
  liaison,
  admin as orgAdmin,
  owner,
  super_admin,
  support,
} from "./permission";
import { blockSessionGrantingEmailPaths } from "./session-path-guard";

// Local dev runs over http, so secure and cross-subdomain cookies must be off.
const isLocalDev = process.env.NODE_ENV !== "production";

// Dev-only: vite serves the apps on these origins regardless of the configured URLs.
const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:3001"];

// Passkeys are the only credential. A Google or Microsoft password is as
// forwardable as ours, so social sign-in is off. Kept commented so the previous
// configuration stays recoverable if the passkey rollout is reversed.
// const socialProviders: BetterAuthOptions["socialProviders"] = {
//   google: {
//     clientId: appConfig.GOOGLE_CLIENT_ID,
//     clientSecret: appConfig.GOOGLE_CLIENT_SECRET,
//   },
// };
//
// if (appConfig.MICROSOFT_CLIENT_ID && appConfig.MICROSOFT_CLIENT_SECRET) {
//   socialProviders.microsoft = {
//     clientId: appConfig.MICROSOFT_CLIENT_ID,
//     clientSecret: appConfig.MICROSOFT_CLIENT_SECRET,
//     tenantId: "common",
//     prompt: "select_account",
//   };
// }

export const auth = betterAuth({
  appName: appConfig.APP_NAME,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    cookiePrefix: `${appConfig.APP_NAME}-AUTH`,
    useSecureCookies: !isLocalDev,
    defaultCookieAttributes: {
      sameSite: isLocalDev ? "lax" : "none",
    },
    crossSubDomainCookies: {
      enabled: !isLocalDev,
      domain: "refidly.com",
    },
  },

  trustedOrigins: [
    ...(isLocalDev ? DEV_ORIGINS : []),
    appConfig.SUPPORT_URL,
    appConfig.WEBSITE_URL,
    appConfig.API_URL,
  ],
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: 60,
    max: 100,
    customRules: {
      // Read-only session plumbing: every navigation fires these, so the
      // shared 100/60s budget ran out during ordinary use and the 429 read
      // as a signed-out session. Credential routes keep the strict default.
      "/get-session": { window: 60, max: 600 },
      "/organization/list": { window: 60, max: 300 },
      "/one-time-token/generate": { window: 60, max: 300 },
      "/passkey/generate-authenticate-options": { window: 60, max: 10 },
      "/passkey/verify-authentication": { window: 60, max: 10 },
      "/passkey/generate-register-options": { window: 300, max: 10 },
      "/passkey/verify-registration": { window: 300, max: 10 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Written to hold even if a plugin re-registers one of these routes, so
      // it has to run on every request rather than rely on the plugin list.
      blockSessionGrantingEmailPaths(ctx);
      requireImpersonationReason(ctx);
    }),
    after: createAuthMiddleware(async (ctx) => {
      await auditAdminActions(ctx);
      await invalidateSessionContextAfterMembershipChange(ctx);
    }),
  },
  databaseHooks: {
    session: {
      create: {
        before: beforeSessionCreate,
      },
      update: {
        before: beforeSessionUpdate,
      },
    },
  },
  user: {
    modelName: "user",
    fields: {
      id: "id",
      name: "name",
      email: "email",
      emailVerified: "emailVerified",
      image: "image",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      banned: "banned",
      banReason: "banReason",
      banExpires: "banExpires",
      stripeCustomerId: "stripeCustomerId",
    },
    additionalFields: {
      isOnboarded: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
  account: {
    modelName: "UserAccount",
    // Keyed by BETTER_AUTH_SECRET, not ENCRYPTION_KEY, so the prisma encryption
    // extension must never also list UserAccount or tokens double-encrypt.
    encryptOAuthTokens: true,
    fields: {
      id: "id",
      accountId: "accountId",
      providerId: "providerId",
      userId: "userId",
      accessToken: "accessToken",
      refreshToken: "refreshToken",
      idToken: "idToken",
      accessTokenExpiresAt: "accessTokenExpiresAt",
      scope: "scope",
      password: "password",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  verification: {
    modelName: "verification",
    fields: {
      id: "id",
      identifier: "identifier",
      value: "value",
      expiresAt: "expiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  subscription: {
    modelName: "subscription",
    fields: {
      id: "id",
      plan: "plan",
      referenceId: "referenceId",
      stripeCustomerId: "stripeCustomerId",
      stripeSubscriptionId: "stripeSubscriptionId",
      status: "status",
      periodStart: "periodStart",
      periodEnd: "periodEnd",
      cancelAtPeriodEnd: "cancelAtPeriodEnd",
    },
  },
  // socialProviders,
  // Passkey signup marks the address verified at creation, so this mostly serves
  // accounts that predate it. autoSignInAfterVerification stays off deliberately:
  // a link that turns a mailbox into a session is weaker than what it guards.
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 60 * 10,
    sendVerificationEmail,
  },
  // Password sign-in runs alongside passkeys. Sign-up stays closed here because
  // accounts are still created by the OTP plus passkey flow; a reset is how an
  // existing user sets a first password.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 10,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword,
    onPasswordReset,
  },
  plugins: [
    passkey({
      rpID: appConfig.PASSKEY_RP_ID,
      rpName: appConfig.APP_NAME,
      // The ceremony runs in the browser and the verifier compares against the
      // browser origin, so this must be the frontend origin, never API_URL.
      origin: isLocalDev ? DEV_ORIGINS : appConfig.WEBSITE_URL,
      authenticatorSelection: {
        // Discoverable so sign-in types no email; user verification on every use.
        residentKey: "required",
        userVerification: "required",
      },
      registration: {
        requireSession: false,
        resolveUser: resolvePasskeyRegistrationUser,
        afterVerification: afterPasskeyRegistration,
      },
      authentication: {
        afterVerification: afterPasskeyAuthentication,
      },
    }),
    twoFactor({
      issuer: appConfig.APP_NAME,
      // Sign-in is passkey-first, so most accounts hold no password to confirm.
      allowPasswordless: true,
      // Email OTP is the only second factor, so no authenticator app is needed.
      otpOptions: {
        period: 5,
        sendOTP: sendTwoFactorOtp,
      },
      schema: {
        twoFactor: {
          modelName: "TwoFactor",
          fields: {
            secret: "secret",
            backupCodes: "backupCodes",
            userId: "userId",
          },
        },
        user: {
          fields: {
            twoFactorEnabled: "twoFactorEnabled",
          },
        },
      },
    }),
    oneTimeToken(),
    admin({
      ac,
      roles: {
        super_admin,
        support,
      },
      schema: {
        user: {
          fields: {
            role: "role",
            banReason: "banReason",
            banExpires: "banExpires",
            banned: "banned",
          },
        },
      },
    }),
    organization({
      ac,
      roles: {
        owner,
        admin: orgAdmin,
        member,
        liason: liaison,
      },
      organizationHooks: {
        beforeCreateOrganization,
        afterCreateOrganization,
        beforeUpdateOrganization,
        beforeDeleteOrganization,
        afterDeleteOrganization,
        beforeAddMember,
        afterAddMember,
        beforeRemoveMember,
        afterRemoveMember,
        beforeUpdateMemberRole,
        afterUpdateMemberRole,
        beforeCreateInvitation,
        beforeAcceptInvitation,
        afterAcceptInvitation,
        afterRejectInvitation,
        afterCancelInvitation,
        beforeCreateTeam,
        beforeUpdateTeam,
      },
      sendInvitationEmail,
      schema: {
        organization: {
          modelName: "organization",
          fields: {
            id: "id",
            name: "name",
            slug: "slug",
            logo: "logo",
            metadata: "metadata",
            createdAt: "createdAt",
            updatedAt: "organization_updated_at",
          },
        },
        member: {
          modelName: "member",
          fields: {
            id: "id",
            role: "role",
            createdAt: "createdAt",
            updatedAt: "updatedAt",
          },
        },
        invitation: {
          modelName: "invitation",
          fields: {
            organizationId: "organizationId",
            organization: "organization",
            email: "email",
            role: "role",
            status: "status",
            expiresAt: "expiresAt",
            createdAt: "createdAt",
            inviterId: "inviterId",
          },
        },
      },
    }),
    // Password breach checks have nothing to check once passwords are gone.
    // haveIBeenPwned(),
    openAPI(),
    stripe({
      schema: {
        user: {
          fields: {
            stripeCustomerId: "stripeCustomerId",
          },
        },
        subscription: {
          modelName: "subscription",
          fields: {
            id: "id",
            plan: "plan",
            referenceId: "referenceId",
            stripeCustomerId: "stripeCustomerId",
            stripeSubscriptionId: "stripeSubscriptionId",
            status: "status",
            periodStart: "periodStart",
            periodEnd: "periodEnd",
            cancelAtPeriodEnd: "cancelAtPeriodEnd",
            seats: "seats",
            trialStart: "trialStart",
            trialEnd: "trialEnd",
            cancelAt: "cancelAt",
            canceledAt: "canceledAt",
            endedAt: "endedAt",
            billingInterval: "billingInterval",
            stripeScheduleId: "stripeScheduleId",
          },
        },
      },
      stripeClient,
      onEvent: async (event: any) => {
        await StripeHelper(event);
      },
      stripeWebhookSecret: appConfig.STRIPE_WEBHOOK_SECRET!,
      // The billing customer is the organization, so no per-user customer.
      createCustomerOnSignUp: false,
      authorizeReference: stripeAuthorizeReference,
      organization: {
        enabled: true,
      },
      subscription: {
        enabled: true,
        plans: BETTER_AUTH_PLANS,
        authorizeReference: subscriptionAuthorizeReference,
        getCheckoutSessionParams: () => ({
          params: {
            ...TAX_CHECKOUT_BASE,
            payment_method_types: ["card", "us_bank_account"],
          },
        }),
        // Session-level payment_method_types covers only the first charge, and
        // Checkout's subscription_data has no payment_settings, so ACH is
        // carried onto renewals here or renewals silently fall back to card.
        onSubscriptionComplete: persistSubscriptionPaymentSettings,
      },
    }),
    customSession(customSessionHandler),
  ],
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, "EX", ttl);
      else await redis.set(key, value);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  session: {
    expiresIn: 60 * 60 * 12, // 12h absolute (HIPAA §164.312(a)(2)(iii))
    updateAge: 60 * 15, // sliding 15m idle refresh
    cookieCache: {
      enabled: true,
      maxAge: 60, // 60s cookie cache
    },
  },
  schema: {
    auth: {
      schema: "auth_schema",
    },
    stripe: {
      schema: "stripe_schema",
    },
    public: {
      schema: "public",
    },
  },
});
