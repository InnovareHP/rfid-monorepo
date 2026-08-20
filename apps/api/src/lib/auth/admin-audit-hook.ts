import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { prisma } from "../prisma/prisma";
import {
  hasImpersonationReason,
  IMPERSONATE_PATH,
  isAuditedAdminPath,
  MIN_IMPERSONATION_REASON_LENGTH,
  resolveAuditEntry,
  resolveAuditNames,
} from "./admin-audit";

export const requireImpersonationReason = (ctx: {
  path: string;
  headers?: Headers;
}) => {
  if (ctx.path !== IMPERSONATE_PATH) return;

  if (!hasImpersonationReason(ctx.headers)) {
    throw new APIError("BAD_REQUEST", {
      message: `Impersonation requires a reason of at least ${MIN_IMPERSONATION_REASON_LENGTH} characters.`,
    });
  }
};

export const auditAdminActions = createAuthMiddleware(async (ctx) => {
  if (!isAuditedAdminPath(ctx.path)) return;

  // The dispatcher hands failed calls to after hooks too, and a rejected action
  // is not an action.
  if (ctx.context.returned instanceof APIError) return;

  const session = await getSessionFromCtx(ctx);
  const entry = resolveAuditEntry({
    path: ctx.path,
    body: ctx.body,
    headers: ctx.headers,
    session,
  });
  if (!entry || !session) return;

  const named = await resolveAuditNames({
    entry,
    sessionUser: { id: session.user.id, name: session.user.name },
    lookupName: async (userId) =>
      (
        await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        })
      )?.name ?? null,
  });

  await prisma.adminActivityLog.create({ data: named });
});
