import { AdminAction } from "@prisma/client";
import {
  hasImpersonationReason,
  resolveAuditEntry,
  resolveAuditNames,
} from "./admin-audit";

const adminSession = { session: { userId: "admin-1" } };

const headers = (init: Record<string, string>) => new Headers(init);

describe("resolveAuditEntry", () => {
  it.each([
    ["/admin/ban-user", AdminAction.BAN_USER],
    ["/admin/unban-user", AdminAction.UNBAN_USER],
    ["/admin/set-role", AdminAction.SET_ROLE],
    ["/admin/remove-user", AdminAction.REMOVE_USER],
    ["/admin/impersonate-user", AdminAction.IMPERSONATE_USER],
    ["/admin/set-user-password", AdminAction.SET_PASSWORD],
    ["/admin/revoke-user-session", AdminAction.REVOKE_SESSIONS],
    ["/admin/revoke-user-sessions", AdminAction.REVOKE_SESSIONS],
    ["/admin/update-user", AdminAction.UPDATE_USER],
  ])("maps %s to %s", (path, action) => {
    const entry = resolveAuditEntry({
      path,
      body: { userId: "target-1" },
      headers: headers({ "x-impersonation-reason": "ticket 1423 export bug" }),
      session: adminSession,
    });

    expect(entry).toMatchObject({
      adminId: "admin-1",
      action,
      targetUserId: "target-1",
    });
  });

  it("ignores paths that are not admin mutations", () => {
    expect(
      resolveAuditEntry({
        path: "/admin/list-users",
        session: adminSession,
      })
    ).toBeNull();
  });

  it("ignores a call with no session rather than logging a headless actor", () => {
    expect(
      resolveAuditEntry({ path: "/admin/ban-user", session: null })
    ).toBeNull();
  });

  it("credits the borrowed-from admin when impersonation stops", () => {
    const entry = resolveAuditEntry({
      path: "/admin/stop-impersonating",
      session: { session: { userId: "target-1", impersonatedBy: "admin-1" } },
    });

    expect(entry).toMatchObject({
      adminId: "admin-1",
      action: AdminAction.STOP_IMPERSONATE,
      targetUserId: "target-1",
    });
  });

  it("skips a stop with no impersonator to credit", () => {
    expect(
      resolveAuditEntry({
        path: "/admin/stop-impersonating",
        session: { session: { userId: "target-1", impersonatedBy: null } },
      })
    ).toBeNull();
  });

  it("records the impersonation reason from the header", () => {
    const entry = resolveAuditEntry({
      path: "/admin/impersonate-user",
      body: { userId: "target-1" },
      headers: headers({ "x-impersonation-reason": "ticket 1423 export bug" }),
      session: adminSession,
    });

    expect(entry?.details).toBe("ticket 1423 export bug");
  });

  it("records the ban reason and the new role", () => {
    expect(
      resolveAuditEntry({
        path: "/admin/ban-user",
        body: { userId: "target-1", banReason: "shared credentials" },
        session: adminSession,
      })?.details
    ).toBe("Reason: shared credentials");

    expect(
      resolveAuditEntry({
        path: "/admin/set-role",
        body: { userId: "target-1", role: ["support"] },
        session: adminSession,
      })?.details
    ).toBe("New role: support");
  });

  it("records which fields an admin edit touched", () => {
    expect(
      resolveAuditEntry({
        path: "/admin/update-user",
        body: { userId: "target-1", data: { emailVerified: true } },
        session: adminSession,
      })?.details
    ).toBe("Fields: emailVerified");
  });

  it("takes the client ip from the first forwarded-for entry", () => {
    const entry = resolveAuditEntry({
      path: "/admin/ban-user",
      body: { userId: "target-1" },
      headers: headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      session: adminSession,
    });

    expect(entry?.ipAddress).toBe("203.0.113.7");
  });
});

describe("hasImpersonationReason", () => {
  it("rejects a missing reason", () => {
    expect(hasImpersonationReason(undefined)).toBe(false);
  });

  it("rejects a reason too short to mean anything", () => {
    expect(
      hasImpersonationReason(headers({ "x-impersonation-reason": "debug" }))
    ).toBe(false);
  });

  it("rejects whitespace padded to length", () => {
    expect(
      hasImpersonationReason(
        headers({ "x-impersonation-reason": "abc          " })
      )
    ).toBe(false);
  });

  it("admits a stated reason", () => {
    expect(
      hasImpersonationReason(
        headers({ "x-impersonation-reason": "ticket 1423 export bug" })
      )
    ).toBe(true);
  });
});

describe("resolveAuditNames", () => {
  const sessionUser = { id: "admin-1", name: "Ada Admin" };
  const entry = {
    adminId: "admin-1",
    action: AdminAction.BAN_USER,
    targetUserId: "target-1",
  };

  it("takes the session side's name from the session, not the database", async () => {
    const lookupName = jest.fn(async () => "Tim Target");

    const named = await resolveAuditNames({ entry, sessionUser, lookupName });

    expect(named).toMatchObject({
      adminName: "Ada Admin",
      targetName: "Tim Target",
    });
    expect(lookupName).toHaveBeenCalledTimes(1);
    expect(lookupName).toHaveBeenCalledWith("target-1");
  });

  it("labels an account that no longer exists", async () => {
    const named = await resolveAuditNames({
      entry,
      sessionUser,
      lookupName: async () => null,
    });

    expect(named.targetName).toBe("Deleted account");
  });

  it("leaves the target name unset when the action has no target", async () => {
    const named = await resolveAuditNames({
      entry: { adminId: "admin-1", action: AdminAction.STOP_IMPERSONATE },
      sessionUser,
      lookupName: async () => "unused",
    });

    expect(named.targetName).toBeUndefined();
  });

  it("looks up the admin when the session belongs to the impersonated user", async () => {
    const named = await resolveAuditNames({
      entry: {
        adminId: "admin-1",
        action: AdminAction.STOP_IMPERSONATE,
        targetUserId: "target-1",
      },
      sessionUser: { id: "target-1", name: "Tim Target" },
      lookupName: async () => "Ada Admin",
    });

    expect(named).toMatchObject({
      adminName: "Ada Admin",
      targetName: "Tim Target",
    });
  });
});
