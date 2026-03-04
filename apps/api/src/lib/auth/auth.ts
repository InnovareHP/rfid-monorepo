import { stripe } from "@better-auth/stripe";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import {
  admin,
  haveIBeenPwned,
  oneTimeToken,
  openAPI,
  organization,
} from "better-auth/plugins";
import { appConfig } from "../../config/app-config";
import { StripeHelper } from "../helper.js";
import { prisma } from "../prisma/prisma";
import { redis } from "../redis/redis";
import { stripe as stripeClient } from "../stripe/stripe";
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
  onPasswordReset,
  sendInvitationEmail,
  sendMagicLink,
  sendResetPassword,
  sendVerificationEmail,
  stripeAuthorizeReference,
  subscriptionAuthorizeReference,
} from "./auth-helper";
import { ac, liason, owner, super_admin, support } from "./permission";

export const auth = betterAuth({
  appName: appConfig.APP_NAME,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    cookiePrefix: `${appConfig.APP_NAME}-AUTH`,
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: appConfig.WEBSITE_URL.includes("localhost") ? "lax" : "none",
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: appConfig.WEBSITE_URL.includes("localhost")
        ? "localhost"
        : "innovarehp.com",
    },
  },

  trustedOrigins: [
    appConfig.SUPPORT_URL,
    appConfig.WEBSITE_URL,
    appConfig.API_URL,
  ],
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
  socialProviders: {
    google: {
      clientId: appConfig.GOOGLE_CLIENT_ID,
      clientSecret: appConfig.GOOGLE_CLIENT_SECRET,
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 1000 * 60 * 10, // 10 minutes
    sendVerificationEmail,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    expiresIn: 1000 * 60 * 10, // 10 minutes
    sendResetPassword,
    onPasswordReset,
    sendMagicLink,
  },
  plugins: [
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
        liason,
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
    haveIBeenPwned(),
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
          },
        },
      },
      stripeClient,
      onEvent: async (event: any) => {
        await StripeHelper(event);
      },
      stripeWebhookSecret: appConfig.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      authorizeReference: stripeAuthorizeReference,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "Dashboard",
            priceId: "price_1SUpOoCVzwuBDRu4m7JnkjKf",
            limits: {
              seats: 10,
            },
            freeTrial: {
              days: 14,
              onTrialStart: async (subscription) => {
                console.log(subscription);
              },
              onTrialEnd: async ({ subscription }) => {
                console.log(subscription);
              },
              onTrialExpired: async (subscription) => {
                console.log(subscription);
              },
            },
          },
        ],
        authorizeReference: subscriptionAuthorizeReference,
        onSubscriptionComplete: async ({}) => {
          console.log("Welcome");
        },
        onSubscriptionUpdate: async ({ event, subscription }) => {
          console.log(`Subscription ${subscription.id} updated`);
        },
        onSubscriptionCancel: async ({}) => {
          console.log("Cancelled");
        },
        onSubscriptionDeleted: async ({ subscription }) => {
          console.log(`Subscription ${subscription.id} deleted`);
        },
      },
    }),
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
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
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
