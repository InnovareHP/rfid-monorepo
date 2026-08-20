import { APIError } from "better-auth/api";

// A link or code mailed to an inbox that lands the caller in a session proves
// only that they can read the inbox. Password sign-in and password reset are
// deliberately not on this list: they need the password too. These stay blocked
// even if a plugin re-registers the route later.
//
// Account creation stays closed here as well. New accounts come from the OTP
// plus passkey registration flow, so an open /sign-up/email would be a second
// way in with weaker proof.
const BLOCKED_PATHS = new Set([
  "/sign-up/email",
  "/sign-in/magic-link",
  "/magic-link/verify",
  "/sign-in/email-otp",
  "/email-otp/verify-email",
  "/forget-password/email-otp",
  "/email-otp/reset-password",
]);

export const blockSessionGrantingEmailPaths = (ctx: { path: string }) => {
  if (BLOCKED_PATHS.has(ctx.path)) {
    throw new APIError("NOT_FOUND", {
      message: "This sign-in method is disabled. Use your passkey.",
    });
  }
};
