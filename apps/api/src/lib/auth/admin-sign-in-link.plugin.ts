import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import z from "zod";
import {
  redeemAdminSignInLink,
  SIGN_IN_LINK_VERIFY_PATH,
  SignInLinkError,
} from "./admin-sign-in-link";

// A thin wrapper on purpose: better-auth/api is ESM only, so everything worth
// testing lives in admin-sign-in-link.ts and this file just carries the cookie.
export const adminSignInLink = () => ({
  id: "admin-sign-in-link",
  endpoints: {
    verifyAdminSignInLink: createAuthEndpoint(
      SIGN_IN_LINK_VERIFY_PATH,
      {
        method: "POST",
        body: z.object({ token: z.string().min(1) }),
      },
      async (ctx) => {
        try {
          const { user, session } = await redeemAdminSignInLink(
            ctx.body.token,
            ctx.context.internalAdapter
          );

          await setSessionCookie(ctx, { session, user });

          return ctx.json({ ok: true });
        } catch (error) {
          // Only the refusals answer with this; a database failure stays a 500
          // rather than telling the holder their good link is expired.
          if (error instanceof SignInLinkError) {
            throw new APIError("BAD_REQUEST", {
              message: "This link is invalid or has expired.",
            });
          }

          throw error;
        }
      }
    ),
  },
});
