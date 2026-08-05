import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES } from "@dashboard/shared";

// better-auth/plugins/access ships ESM only and jest runs the API in CJS, so
// the role objects are stubbed here. The grant matrix itself is checked against
// the real engine by scripts/verify-permissions.mjs.
const authorize = jest.fn();
jest.mock("../../lib/auth/permission", () => ({
  orgRoles: { owner: { authorize: (...a: unknown[]) => authorize(...a) } },
}));

import { PermissionGuard, RequirePermission } from "./permission.guard";

const contextFor = (memberRole?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () =>
        memberRole === undefined ? {} : { session: { session: { memberRole } } },
    }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  }) as any;

const guardWith = (required: unknown) => {
  const reflector = new Reflector();
  jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(required as never);
  return new PermissionGuard(reflector);
};

describe("PermissionGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorize.mockReturnValue({ success: true });
  });

  it("allows a handler that declares no permission", () => {
    expect(guardWith(undefined).canActivate(contextFor(ROLES.OWNER))).toBe(true);
    expect(authorize).not.toHaveBeenCalled();
  });

  it("rejects a request with no session before checking the role", () => {
    expect(() =>
      guardWith({ report: ["read"] }).canActivate(contextFor(undefined))
    ).toThrow(UnauthorizedException);
  });

  // An unrecognised role must fail closed rather than skip the check.
  it("rejects a member role with no role definition", () => {
    expect(() =>
      guardWith({ report: ["read"] }).canActivate(contextFor("not_a_role"))
    ).toThrow(ForbiddenException);
    expect(authorize).not.toHaveBeenCalled();
  });

  it("passes the declared permission through to better-auth verbatim", () => {
    guardWith({ record: ["create", "import"] }).canActivate(
      contextFor(ROLES.OWNER)
    );

    expect(authorize).toHaveBeenCalledWith({ record: ["create", "import"] });
  });

  it("denies when better-auth refuses the permission", () => {
    authorize.mockReturnValue({ success: false, error: "nope" });

    expect(() =>
      guardWith({ report: ["read"] }).canActivate(contextFor(ROLES.OWNER))
    ).toThrow(ForbiddenException);
  });

  it("allows when better-auth grants the permission", () => {
    expect(
      guardWith({ report: ["read"] }).canActivate(contextFor(ROLES.OWNER))
    ).toBe(true);
  });

  it("exposes the decorator for controllers", () => {
    expect(typeof RequirePermission({ report: ["read"] })).toBe("function");
  });
});
