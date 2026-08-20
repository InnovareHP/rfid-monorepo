import { createHmac } from "crypto";

const ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
const AUDIT_HMAC_KEY = Buffer.alloc(32, 2).toString("base64");

jest.mock("../../config/app-config", () => ({
  appConfig: {
    ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    AUDIT_HMAC_KEY: Buffer.alloc(32, 2).toString("base64"),
  },
}));

const create = jest.fn();
jest.mock("../prisma/prisma", () => ({
  prisma: { auditLog: { create: (...a: unknown[]) => create(...a) } },
}));

import { AuditService, type AuditEntry } from "./audit.service";

const entry: AuditEntry = {
  actorUserId: "user_a",
  actorOrgId: "org_a",
  actorRole: "owner",
  actorIp: "10.0.0.5",
  action: "board.read",
  resourceType: "board",
  resourceId: "rec_1",
  method: "GET",
  path: "/api/board/rec_1",
  statusCode: 200,
  requestId: "req_1",
};

// Mirrors the service's canonical form so a change to field order or membership
// shows up as a failure rather than as silently unverifiable history.
const canonical = JSON.stringify([
  "user_a",
  "org_a",
  "owner",
  "10.0.0.5",
  "board.read",
  "board",
  "rec_1",
  "GET",
  "/api/board/rec_1",
  200,
  "req_1",
]);

const sign = (key: string) =>
  createHmac("sha256", key).update(canonical).digest("hex");

describe("audit signing", () => {
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    create.mockResolvedValue({});
    service = new AuditService();
  });

  it("signs new rows with the audit key, not the PHI key", async () => {
    await service.record(entry);

    const written = create.mock.calls[0][0].data.changeHash;
    expect(written).toBe(`v2:${sign(AUDIT_HMAC_KEY)}`);
    expect(written).not.toContain(sign(ENCRYPTION_KEY));
  });

  it("verifies a row it just signed", () => {
    expect(service.verify(entry, `v2:${sign(AUDIT_HMAC_KEY)}`)).toBe(true);
  });

  // The whole reason for splitting the keys: history stays checkable.
  it("verifies an unprefixed row signed with the old shared key", () => {
    expect(service.verify(entry, sign(ENCRYPTION_KEY))).toBe(true);
  });

  it("rejects a v2 row that was signed with the PHI key", () => {
    expect(service.verify(entry, `v2:${sign(ENCRYPTION_KEY)}`)).toBe(false);
  });

  it("rejects a legacy row signed with the audit key", () => {
    expect(service.verify(entry, sign(AUDIT_HMAC_KEY))).toBe(false);
  });

  it("rejects a tampered entry", () => {
    const tampered = { ...entry, action: "board.delete" };

    expect(service.verify(tampered, `v2:${sign(AUDIT_HMAC_KEY)}`)).toBe(false);
  });

  it("rejects a missing hash", () => {
    expect(service.verify(entry, null)).toBe(false);
  });
});
