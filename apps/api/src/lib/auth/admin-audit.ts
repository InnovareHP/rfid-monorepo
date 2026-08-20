import { AdminAction } from "@prisma/client";

// Every admin-plugin route that changes a user or a session. Auditing off this
// map rather than off a controller means no client can perform one unrecorded.
const AUDITED_PATHS: Record<string, AdminAction> = {
  "/admin/ban-user": AdminAction.BAN_USER,
  "/admin/unban-user": AdminAction.UNBAN_USER,
  "/admin/set-role": AdminAction.SET_ROLE,
  "/admin/remove-user": AdminAction.REMOVE_USER,
  "/admin/impersonate-user": AdminAction.IMPERSONATE_USER,
  "/admin/stop-impersonating": AdminAction.STOP_IMPERSONATE,
  "/admin/set-user-password": AdminAction.SET_PASSWORD,
  "/admin/revoke-user-session": AdminAction.REVOKE_SESSIONS,
  "/admin/revoke-user-sessions": AdminAction.REVOKE_SESSIONS,
  "/admin/update-user": AdminAction.UPDATE_USER,
};

export const IMPERSONATION_REASON_HEADER = "x-impersonation-reason";
export const MIN_IMPERSONATION_REASON_LENGTH = 10;

export const IMPERSONATE_PATH = "/admin/impersonate-user";

type AuditBody = {
  userId?: string;
  banReason?: string;
  role?: string | string[];
  data?: Record<string, unknown>;
};

type AuditSession = {
  session: { userId: string; impersonatedBy?: string | null };
};

export type AuditEntry = {
  adminId: string;
  action: AdminAction;
  targetUserId?: string;
  details?: string;
  ipAddress?: string;
};

export type NamedAuditEntry = AuditEntry & {
  adminName: string;
  targetName?: string;
};

// The log carries names, not foreign keys, so a row still reads after the
// account is deleted. One side of every action is the session user; the other
// costs a lookup, and an account already gone reads as deleted rather than blank.
export const resolveAuditNames = async (input: {
  entry: AuditEntry;
  sessionUser: { id: string; name: string };
  lookupName: (userId: string) => Promise<string | null>;
}): Promise<NamedAuditEntry> => {
  const { entry, sessionUser, lookupName } = input;

  const nameFor = async (userId: string) =>
    userId === sessionUser.id
      ? sessionUser.name
      : ((await lookupName(userId)) ?? "Deleted account");

  return {
    ...entry,
    adminName: await nameFor(entry.adminId),
    targetName: entry.targetUserId
      ? await nameFor(entry.targetUserId)
      : undefined,
  };
};

export const isAuditedAdminPath = (path: string) => !!AUDITED_PATHS[path];

// The reason rides in a header because the admin plugin's zod schema strips keys
// it does not declare, so a body field would never reach the hook.
export const readImpersonationReason = (headers: Headers | undefined) =>
  headers?.get(IMPERSONATION_REASON_HEADER)?.trim() ?? "";

export const hasImpersonationReason = (headers: Headers | undefined) =>
  readImpersonationReason(headers).length >= MIN_IMPERSONATION_REASON_LENGTH;

const buildDetails = (
  action: AdminAction,
  body: AuditBody,
  headers: Headers | undefined
) => {
  if (action === AdminAction.IMPERSONATE_USER) {
    return readImpersonationReason(headers);
  }
  if (action === AdminAction.BAN_USER && body.banReason) {
    return `Reason: ${body.banReason}`;
  }
  if (action === AdminAction.SET_ROLE) {
    const role = Array.isArray(body.role) ? body.role.join(", ") : body.role;
    return role ? `New role: ${role}` : undefined;
  }
  if (action === AdminAction.UPDATE_USER && body.data) {
    return `Fields: ${Object.keys(body.data).join(", ")}`;
  }
  return undefined;
};

export const resolveAuditEntry = (input: {
  path: string;
  body?: AuditBody;
  headers?: Headers;
  session: AuditSession | null;
}): AuditEntry | null => {
  const action = AUDITED_PATHS[input.path];
  if (!action || !input.session) return null;

  const body = input.body ?? {};
  const { session } = input.session;

  // Stopping impersonation runs on the impersonated session, so the admin is the
  // account it was borrowed from and the target is whoever was being viewed.
  const isStop = action === AdminAction.STOP_IMPERSONATE;
  const adminId = isStop ? session.impersonatedBy : session.userId;
  if (!adminId) return null;

  return {
    adminId,
    action,
    targetUserId: isStop ? session.userId : body.userId,
    details: buildDetails(action, body, input.headers),
    ipAddress: input.headers?.get("x-forwarded-for")?.split(",")[0]?.trim(),
  };
};
