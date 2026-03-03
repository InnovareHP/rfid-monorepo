import { stripe } from "@better-auth/stripe";
import { betterAuth, User } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  admin,
  haveIBeenPwned,
  oneTimeToken,
  openAPI,
  organization,
} from "better-auth/plugins";
import { ReferralDashboardEmail } from "src/react-email/confirmation-email";
import Stripe from "stripe";
import { appConfig } from "../../config/app-config";
import { InvitationEmail } from "../../react-email/invitation-email";
import { ResetPasswordEmail } from "../../react-email/reset-password-email";
import { StripeHelper } from "../helper.js";
import { prisma } from "../prisma/prisma";
import { emailQueue } from "../queue/email-queue";
import { redis } from "../redis/redis";
import { renderEmailHtml } from "../resend/resend";
import { stripe as stripeClient } from "../stripe/stripe";
import { OnboardingSeeding } from "./onboarding";
import { ac, liason, owner, super_admin, support } from "./permission";

export const auth = betterAuth({
  appName: appConfig.APP_NAME,
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

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    appConfig.SUPPORT_URL,
    appConfig.WEBSITE_URL,
    appConfig.API_URL,
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const organization = await prisma.user.findFirst({
            where: {
              id: session.userId,
            },
            select: {
              members: {
                select: {
                  organizationId: true,
                  role: true,
                  id: true,
                },
                take: 1,
              },
            },
          });

          const activeOrganizationId = organization?.members[0]?.organizationId;
          return {
            data: {
              ...session,
              memberRole: organization?.members[0]?.role,
              memberId: organization?.members[0]?.id,
              activeOrganizationId,
            },
          };
        },
      },
      update: {
        before: async (session: MemberSession["session"]) => {
          const member = await prisma.member.findFirst({
            where: {
              id: session.userId,
              organizationId: session.activeOrganizationId,
            },

            select: {
              organizationId: true,
              role: true,
              id: true,
            },
          });

          return {
            data: {
              ...session,
              memberRole: member?.role,
              memberId: member?.id,
            },
          };
        },
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
      accounts: "accounts",
    },
    additionalFields: {
      isOnboarded: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
  account: {
    modelName: "userAccount",
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
    sendVerificationEmail: async ({ url, user, token }) => {
      const tokenUrl = `${url}?token=${token}`;
      const html = await renderEmailHtml(
        ReferralDashboardEmail({
          magicLink: tokenUrl,
          name: user.name,
        })
      );
      await emailQueue.add("send", {
        to: user.email,
        subject: `Verify your ${appConfig.APP_NAME} account`,
        html,
        from: `${appConfig.APP_EMAIL}`,
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    expiresIn: 1000 * 60 * 10, // 10 minutes
    sendResetPassword: async ({ user, url, token }) => {
      const tokenUrl = `${url}?token=${token}`;
      const html = await renderEmailHtml(
        ResetPasswordEmail({
          magicLink: tokenUrl,
          name: user.name,
        })
      );
      await emailQueue.add("send", {
        to: user.email,
        subject: "Reset your password",
        html,
        from: `${appConfig.APP_EMAIL}`,
      });
    },
    onPasswordReset: async ({ user }) => {
      await emailQueue.add("send", {
        to: user.email,
        subject: "Reset your password",
        html: "password reset",
        from: `${appConfig.APP_EMAIL}`,
      });
    },
    sendMagicLink: async ({
      user,
      url,
      token,
    }: {
      user: User;
      url: string;
      token: string;
    }) => {
      const tokenUrl = `${url}?token=${token}`;
      const html = await renderEmailHtml(
        ReferralDashboardEmail({
          magicLink: tokenUrl,
        })
      );
      await emailQueue.add("send", {
        to: user.email,
        subject: `Login to your ${appConfig.APP_NAME} account`,
        html,
        from: `${appConfig.APP_EMAIL}`,
      });
    },
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
        beforeCreateOrganization: async ({ organization, user }) => {
          return {
            data: {
              ...organization,
              activeOrganizationId: organization.id,
            },
          };
        },

        afterCreateOrganization: async ({ organization }) => {
          await OnboardingSeeding(organization.id);
        },
        beforeUpdateOrganization: async ({ organization }) => {
          return {
            data: {
              name: organization.name?.toLowerCase(),
            },
          };
        },
        afterUpdateOrganization: async () => {
          //   // Sync changes to external systems
          //   await syncOrganizationToExternalSystems(organization);
        },
      },
      sendInvitationEmail: async (data) => {
        const html = await renderEmailHtml(
          InvitationEmail({
            invitation: {
              email: data.email,
              organizationName: data.organization.name,
              inviterName: data.inviter.user.name,
              inviteLink: `${appConfig.WEBSITE_URL}/invitation/accept?token=${data.invitation.id}`,
              rejectLink: `${appConfig.WEBSITE_URL}/invitation/reject?token=${data.invitation.id}`,
            },
          })
        );
        await emailQueue.add("send", {
          to: data.email,
          subject: `Login to your ${appConfig.APP_NAME} account`,
          html,
          from: `${appConfig.APP_EMAIL}`,
        });
      },
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
      onEvent: async (event: Stripe.Event) => {
        await StripeHelper(event);
      },
      stripeWebhookSecret: appConfig.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      authorizeReference: async ({ user, referenceId }) => {
        const member = await prisma.member.findFirst({
          where: {
            userId: user.id,
            organizationId: referenceId,
          },
        });

        return member?.role === "owner";
      },
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

        authorizeReference: async ({ session, action }) => {
          if (
            action === "upgrade-subscription" ||
            action === "cancel-subscription" ||
            action === "restore-subscription"
          ) {
            const org = await prisma.member.findFirst({
              where: {
                id: session.memberId,
              },
              select: {
                role: true,
              },
            });

            return org?.role === "owner";
          }
          return true;
        },

        onSubscriptionComplete: async ({}) => {
          console.log("Welcome");
        },
        onSubscriptionUpdate: async ({ event, subscription }) => {
          // Called when a subscription is updated
          console.log(`Subscription ${subscription.id} updated`);
        },
        onSubscriptionCancel: async ({}) => {
          console.log("Cancelled");
        },
        onSubscriptionDeleted: async ({ subscription }) => {
          // Called when a subscription is deleted
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
