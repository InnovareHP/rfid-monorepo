import { deleteData, purgeAllCacheKeys } from "../redis/redis";
import type { ResolvedSessionMembership } from "./auth-helper";

// customSession runs on every getSession(), and the AuthGuard calls that once
// per guarded request, so this handler's three queries were being paid by every
// endpoint before its own work started. The org-scoped half is cached; the
// session and user still come from Better Auth on each call.
export const SESSION_CONTEXT_TTL_SECONDS = 30;

// Organization first so a role change can purge the whole organization with
// the shared prefix helper.
export const sessionContextKey = (organizationId: string, userId: string) =>
  `session-context:${organizationId}:${userId}`;

export type CachedSessionContext = {
  membership: ResolvedSessionMembership;
  member: {
    id: string;
    role: string | null;
    organizationId: string;
  } | null;
  organization: unknown;
  subscription: unknown;
};

export const invalidateSessionContext = (
  organizationId: string,
  userId: string
) => deleteData(sessionContextKey(organizationId, userId));

// Membership drives the role every permission check reads, so a role change
// drops every cached context for that organization, not just one user's.
export const invalidateOrganizationSessionContext = (organizationId: string) =>
  purgeAllCacheKeys(`session-context:${organizationId}`);
