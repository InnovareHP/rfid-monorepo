import { ROLES } from "@dashboard/shared";
import { describe, expect, it } from "vitest";
import { can } from "./permissions";

// Mirrors apps/api/scripts/verify-permissions.mjs so a divergence between the
// two apps fails here rather than as a 403 the user sees at runtime.
describe("can", () => {
  it("fails closed for a missing or unknown role", () => {
    expect(can(undefined, { record: ["read"] })).toBe(false);
    expect(can(null, { record: ["read"] })).toBe(false);
    expect(can("not_a_role", { record: ["read"] })).toBe(false);
  });

  it("keeps billing owner only", () => {
    expect(can(ROLES.OWNER, { billing: ["manage_billing"] })).toBe(true);
    expect(can(ROLES.ADMIN, { billing: ["manage_billing"] })).toBe(false);
    expect(can(ROLES.MEMBER, { billing: ["manage_billing"] })).toBe(
      false
    );
    expect(can(ROLES.LIAISON, { billing: ["manage_billing"] })).toBe(false);
  });

  it("keeps the org-wide reports to the admin roles", () => {
    expect(can(ROLES.OWNER, { report: ["read"] })).toBe(true);
    expect(can(ROLES.ADMIN, { report: ["read"] })).toBe(true);
    expect(can(ROLES.MEMBER, { report: ["read"] })).toBe(false);
    expect(can(ROLES.LIAISON, { report: ["read"] })).toBe(false);
  });

  // The one thing separating a member from a liaison.
  it("keeps the expense, mileage and marketing logs away from members", () => {
    expect(can(ROLES.LIAISON, { log: ["read"] })).toBe(true);
    expect(can(ROLES.MEMBER, { log: ["read"] })).toBe(false);
    expect(can(ROLES.MEMBER, { log: ["create"] })).toBe(false);
  });

  it("still lets a member do the day-to-day encoding", () => {
    expect(can(ROLES.MEMBER, { record: ["create", "read", "update"] })).toBe(
      true
    );
    expect(can(ROLES.MEMBER, { task: ["create"] })).toBe(true);
    expect(can(ROLES.MEMBER, { outreach: ["create"] })).toBe(true);
    expect(can(ROLES.MEMBER, { analytics: ["read"] })).toBe(true);
  });

  it("keeps import and send to the admin roles", () => {
    expect(can(ROLES.ADMIN, { record: ["import"] })).toBe(true);
    expect(can(ROLES.MEMBER, { record: ["import"] })).toBe(false);
    expect(can(ROLES.LIAISON, { record: ["import"] })).toBe(false);

    expect(can(ROLES.ADMIN, { outreach: ["send"] })).toBe(true);
    expect(can(ROLES.MEMBER, { outreach: ["send"] })).toBe(false);
    expect(can(ROLES.LIAISON, { outreach: ["send"] })).toBe(false);
  });

  it("keeps pipeline configuration to the admin roles", () => {
    expect(can(ROLES.OWNER, { field: ["configure"] })).toBe(true);
    expect(can(ROLES.ADMIN, { field: ["configure"] })).toBe(true);
    expect(can(ROLES.MEMBER, { field: ["configure"] })).toBe(false);
    expect(can(ROLES.LIAISON, { field: ["configure"] })).toBe(false);
  });

  it("lets every role do ordinary record and task work", () => {
    for (const role of [
      ROLES.OWNER,
      ROLES.ADMIN,
      ROLES.MEMBER,
      ROLES.LIAISON,
    ]) {
      expect(can(role, { record: ["create", "read", "update", "delete"] })).toBe(
        true
      );
      expect(
        can(role, { task: ["create", "read", "update", "delete"] })
      ).toBe(true);
    }
  });

  // Log work is every role except member, which is the whole point of member.
  it("lets every role but member work the logs", () => {
    for (const role of [ROLES.OWNER, ROLES.ADMIN, ROLES.LIAISON]) {
      expect(can(role, { log: ["create"] })).toBe(true);
    }
    expect(can(ROLES.MEMBER, { log: ["create"] })).toBe(false);
  });

  // A partially granted resource must fail, not pass on the granted half.
  it("denies when only some actions on a resource are granted", () => {
    expect(can(ROLES.LIAISON, { record: ["create", "import"] })).toBe(false);
  });
});
