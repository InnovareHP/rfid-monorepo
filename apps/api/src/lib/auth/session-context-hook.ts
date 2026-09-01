import { APIError, createAuthMiddleware } from "better-auth/api";
import { invalidateOrganizationSessionContext } from "./auth-helper";

// Membership and organization changes go through Better Auth's own routes, so
// there is no service layer to invalidate from. The cached session context
// carries the member role every permission check reads, so a stale entry would
// keep a demoted member authorized for up to its TTL.
const MEMBERSHIP_PATHS = new Set([
  "/organization/update-member-role",
  "/organization/remove-member",
  "/organization/add-member",
  "/organization/leave",
  "/organization/update",
  "/organization/accept-invitation",
]);

const organizationIdFrom = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;

  const value = (body as { organizationId?: unknown }).organizationId;
  return typeof value === "string" ? value : null;
};

export const invalidateSessionContextAfterMembershipChange =
  createAuthMiddleware(async (ctx) => {
    if (!MEMBERSHIP_PATHS.has(ctx.path)) return;

    // A rejected call changed nothing, so there is nothing to drop.
    if (ctx.context.returned instanceof APIError) return;

    const organizationId =
      organizationIdFrom(ctx.body) ??
      ctx.context.session?.session?.activeOrganizationId ??
      null;

    if (!organizationId) return;

    await invalidateOrganizationSessionContext(organizationId);
  });
