import { APIError, createAuthMiddleware } from "better-auth/api";

// Every one of these proves only that the caller can read an inbox, and every
// one of them ends in a session. Passkeys exist to close exactly that path, so
// they stay blocked even if a plugin re-registers the route later.
const BLOCKED_PATHS = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/sign-in/magic-link",
  "/magic-link/verify",
  "/sign-in/email-otp",
  "/email-otp/verify-email",
  "/forget-password",
  "/forget-password/email-otp",
  "/reset-password",
  "/email-otp/reset-password",
  "/verify-email",
]);

export const blockSessionGrantingEmailPaths = createAuthMiddleware(
  async (ctx) => {
    if (BLOCKED_PATHS.has(ctx.path)) {
      throw new APIError("NOT_FOUND", {
        message: "This sign-in method is disabled. Use your passkey.",
      });
    }
  }
);
