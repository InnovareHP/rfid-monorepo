import { ROLES } from "@dashboard/shared";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { AdminRoleGuard, OwnerRoleGuard } from "./role.guard";

// Minimal ExecutionContext stub carrying only what the guards read.
function contextFor(session: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ session }) }),
  } as ExecutionContext;
}

const sessionWithRole = (memberRole: unknown) => ({ session: { memberRole } });

describe("AdminRoleGuard", () => {
  const guard = new AdminRoleGuard();

  it.each([ROLES.OWNER, ROLES.ADMIN])("admits %s", (role) => {
    expect(guard.canActivate(contextFor(sessionWithRole(role)))).toBe(true);
  });

  it.each([
    ROLES.LIAISON,
    ROLES.ADMISSION_MANAGER,
    ROLES.SUPPORT,
    ROLES.USER,
    ROLES.SUPER_ADMIN,
  ])("rejects %s", (role) => {
    expect(() =>
      guard.canActivate(contextFor(sessionWithRole(role)))
    ).toThrow(ForbiddenException);
  });

  it("rejects a session whose role is missing", () => {
    expect(() =>
      guard.canActivate(contextFor(sessionWithRole(undefined)))
    ).toThrow(ForbiddenException);
  });

  it("rejects an unknown role rather than defaulting open", () => {
    expect(() =>
      guard.canActivate(contextFor(sessionWithRole("owner_")))
    ).toThrow(ForbiddenException);
  });

  it("rejects a role differing only by case", () => {
    expect(() =>
      guard.canActivate(contextFor(sessionWithRole("OWNER")))
    ).toThrow(ForbiddenException);
  });

  it("throws Unauthorized, not Forbidden, when there is no session", () => {
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      UnauthorizedException
    );
  });
});

describe("OwnerRoleGuard", () => {
  const guard = new OwnerRoleGuard();

  it("admits the owner", () => {
    expect(guard.canActivate(contextFor(sessionWithRole(ROLES.OWNER)))).toBe(
      true
    );
  });

  // The comment on the guard states admins are deliberately excluded here.
  it("rejects an admin", () => {
    expect(() =>
      guard.canActivate(contextFor(sessionWithRole(ROLES.ADMIN)))
    ).toThrow(ForbiddenException);
  });

  it.each([ROLES.LIAISON, ROLES.ADMISSION_MANAGER, ROLES.SUPER_ADMIN])(
    "rejects %s",
    (role) => {
      expect(() =>
        guard.canActivate(contextFor(sessionWithRole(role)))
      ).toThrow(ForbiddenException);
    }
  );

  it("rejects a session whose role is missing", () => {
    expect(() =>
      guard.canActivate(contextFor(sessionWithRole(undefined)))
    ).toThrow(ForbiddenException);
  });

  it("throws Unauthorized, not Forbidden, when there is no session", () => {
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      UnauthorizedException
    );
  });
});
