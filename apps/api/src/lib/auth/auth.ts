import { stripe } from "@better-auth/stripe";
import { betterAuth, User } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  admin,
  haveIBeenPwned,
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
import { redis } from "../redis/redis";
import { sendEmail } from "../resend/resend";
import { stripe as stripeClient } from "../stripe/stripe";
import { OnboardingSeeding } from "./onboarding";

export const auth = betterAuth({
  baseURL: appConfig.WEBSITE_URL,
  appName: appConfig.APP_NAME,
  advanced: {
    cookiePrefix: `${appConfig.APP_NAME}-AUTH`,
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: appConfig.WEBSITE_URL.includes("localhost") ? "lax" : "none",
    },
  },
  crossSubDomainCookies: {
    domain: appConfig.WEBSITE_URL.includes("localhost")
      ? ["localhost:3000", "localhost:3001"]
      : ".up.railway.app",
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const organization = await prisma.user_table.findFirst({
            where: {
              id: session.userId,
            },
            select: {
              member_tables: {
                select: {
                  organizationId: true,
                  member_role: true,
                  id: true,
                },
                take: 1,
              },
            },
          });

          const activeOrganizationId =
            organization?.member_tables[0]?.organizationId;
          return {
            data: {
              ...session,
              memberRole: organization?.member_tables[0]?.member_role,
              memberId: organization?.member_tables[0]?.id,
              activeOrganizationId,
            },
          };
        },
      },
      update: {
        before: async (session, ctx) => {
          return { data: session };
        },
      },
    },
  },
  user: {
    modelName: "user_table",
    fields: {
      id: "user_id",
      name: "user_name",
      email: "user_email",
      emailVerified: "user_email_verified",
      image: "user_image",
      createdAt: "user_created_at",
      updatedAt: "user_updated_at",
      banned: "user_is_banned",
      banReason: "user_ban_reason",
      banExpires: "user_ban_expires",
      stripeCustomerId: "user_stripe_customer_id",
      phoneNumber: "user_phone_number",
      phoneNumberVerified: "user_phone_number_verified",
      twoFactorEnabled: "user_two_factor_enabled",
      accounts: "user_account_tables",
    },
    additionalFields: {
      user_is_onboarded: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
  account: {
    modelName: "user_account_table",
    fields: {
      id: "user_account_id",
      accountId: "user_account_account_id",
      providerId: "user_account_provider_id",
      userId: "user_account_user_id",
      accessToken: "user_account_access_token",
      refreshToken: "user_account_refresh_token",
      idToken: "user_account_id_token",
      accessTokenExpiresAt: "user_account_access_token_expires_at",
      scope: "user_account_scope",
      password: "user_account_password",
      createdAt: "user_account_created_at",
      updatedAt: "user_account_updated_at",
    },
  },
  verification: {
    modelName: "verification_table",
    fields: {
      id: "verification_id",
      identifier: "verification_identifier",
      value: "verification_value",
      expiresAt: "verification_expires_at",
      createdAt: "verification_created_at",
      updatedAt: "verification_updated_at",
    },
  },
  subscription: {
    modelName: "subscription_table",
    fields: {
      id: "subscription_id",
      plan: "subscription_plan",
      referenceId: "subscription_reference_id",
      stripeCustomerId: "subscription_stripe_customer_id",
      stripeSubscriptionId: "subscription_stripe_subscription_id",
      status: "subscription_status",
      periodStart: "subscription_period_start",
      periodEnd: "subscription_period_end",
      cancelAtPeriodEnd: "subscription_cancel_at_period_end",
    },
  },
  socialProviders: {
    google: {
      clientId: appConfig.GOOGLE_CLIENT_ID,
      clientSecret: appConfig.GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins: [
    "https://dashboard-fe-prod.up.railway.app",
    appConfig.WEBSITE_URL,
    appConfig.SUPPORT_URL,
    "https://dashboard-be-prod.up.railway.app",
  ],
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 1000 * 60 * 10, // 10 minutes
    sendVerificationEmail: async ({ url, user, token }) => {
      const tokenUrl = `${url}?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: `Verify your ${appConfig.APP_NAME} account`,
        html: ReferralDashboardEmail({
          magicLink: tokenUrl,
          name: user.name,
        }),
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
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: ResetPasswordEmail({
          magicLink: tokenUrl,
          name: user.name,
        }),
        from: `${appConfig.APP_EMAIL}`,
      });
    },
    onPasswordReset: async ({ user }) => {
      await sendEmail({
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
      await sendEmail({
        to: user.email,
        subject: `Login to your ${appConfig.APP_NAME} account`,
        html: ReferralDashboardEmail({
          magicLink: tokenUrl,
        }),
        from: `${appConfig.APP_EMAIL}`,
      });
    },
  },
  plugins: [
    admin({
      schema: {
        user: {
          fields: {
            role: "user_role",
            banReason: "user_ban_reason",
            banExpires: "user_ban_expires",
            banned: "user_is_banned",
          },
        },
      },
    }),
    organization({
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
        await sendEmail({
          to: data.email,
          subject: `Login to your ${appConfig.APP_NAME} account`,
          html: InvitationEmail({
            invitation: {
              email: data.email,
              organizationName: data.organization.name,
              inviterName: data.inviter.user.name,
              inviteLink: `${appConfig.WEBSITE_URL}/invitation/accept?token=${data.invitation.id}`,
              rejectLink: `${appConfig.WEBSITE_URL}/invitation/reject?token=${data.invitation.id}`,
            },
          }),
          from: `${appConfig.APP_EMAIL}`,
        });
      },
      schema: {
        organization: {
          modelName: "organization_table",
          fields: {
            id: "organization_id",
            name: "organization_name",
            slug: "organization_slug",
            logo: "organization_logo",
            metadata: "organization_metadata",
            createdAt: "organization_created_at",
            updatedAt: "organization_updated_at",
          },
        },
        session: {
          fields: {
            activeOrganizationId: "session_active_organization_id",
            activeTeamId: "session_active_team_id",
          },
        },
        member: {
          modelName: "member_table",
          fields: {
            id: "member_id",
            name: "member_name",
            email: "member_email",
            role: "member_role",
            createdAt: "member_created_at",
            updatedAt: "member_updated_at",
          },
        },
        invitation: {
          modelName: "invitation_table",
          fields: {
            organizationId: "organization_id",
            organization: "invitation_organization",
            email: "invitation_email",
            role: "invitation_role",
            status: "invitation_status",
            expiresAt: "invitation_expires_at",
            createdAt: "invitation_created_at",
            inviterId: "invitation_inviter_id",
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
            stripeCustomerId: "user_stripe_customer_id",
          },
        },
        subscription: {
          modelName: "subscription_table",
          fields: {
            id: "subscription_id",
            plan: "subscription_plan",
            referenceId: "subscription_reference_id",
            stripeCustomerId: "subscription_stripe_customer_id",
            stripeSubscriptionId: "subscription_stripe_subscription_id",
            status: "subscription_status",
            periodStart: "subscription_period_start",
            periodEnd: "subscription_period_end",
            cancelAtPeriodEnd: "subscription_cancel_at_period_end",
            seats: "subscription_seats",
            trialStart: "subscription_trial_start",
            trialEnd: "subscription_trial_end",
            cancelAt: "subscription_cancel_at",
            subscription_reference_id: "subscription_reference_id",
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
        const member = await prisma.member_table.findFirst({
          where: {
            userId: user.id,
            organizationId: referenceId,
          },
        });

        return member?.member_role === "owner";
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
            const org = await prisma.member_table.findFirst({
              where: {
                id: session.memberId,
              },
              select: {
                member_role: true,
              },
            });

            return org?.member_role === "owner";
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
  jwt: {
    secret: appConfig.JWT_SECRET,
  },
});
