import { Logger } from "@nestjs/common";
import { ActivityType } from "@prisma/client";

// The service imports the prisma singleton directly, so the module is mocked
// and the transaction callback is handed a set of capturing delegates.
jest.mock("../../lib/prisma/prisma", () => {
  const tx = {
    marketing: { create: jest.fn().mockResolvedValue({}) },
    history: { create: jest.fn().mockResolvedValue({}) },
  };

  return {
    prisma: {
      member: { findFirst: jest.fn() },
      board: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});

import { prisma } from "../../lib/prisma/prisma";
import { LiaisonActivityService } from "./liaison-activity.service";

const ORG = "org-a";
const USER = "user-1";
const MEMBER = "member-1";
const RECORD_ID = "record-1";
const RECORD_NAME = "Sunrise Care";

const mocked = prisma as unknown as {
  member: { findFirst: jest.Mock };
  board: { findFirst: jest.Mock };
  __tx: {
    marketing: { create: jest.Mock };
    history: { create: jest.Mock };
  };
};

const tx = mocked.__tx;

function logActivity(
  service: LiaisonActivityService,
  overrides: Partial<{ activityType: ActivityType; isBulkSend: boolean }> = {}
) {
  return service.logRecordActivity({
    recordId: RECORD_ID,
    organizationId: ORG,
    userId: USER,
    activityType: ActivityType.CALL,
    ...overrides,
  });
}

describe("LiaisonActivityService.logRecordActivity", () => {
  let service: LiaisonActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    mocked.member.findFirst.mockResolvedValue({ id: MEMBER, role: "liason" });
    mocked.board.findFirst.mockResolvedValue({
      recordName: RECORD_NAME,
      moduleType: "LEAD",
    });
    service = new LiaisonActivityService();
  });

  it("mirrors a liaison board activity into the marketing log", async () => {
    await logActivity(service);

    expect(tx.marketing.create).toHaveBeenCalledTimes(1);
    expect(tx.marketing.create.mock.calls[0][0].data).toMatchObject({
      facility: RECORD_NAME,
      touchpoints: ["PHONE"],
      talkedTo: RECORD_NAME,
      memberId: MEMBER,
      organizationId: ORG,
      facilityRecordId: RECORD_ID,
    });
  });

  it.each([
    [ActivityType.CALL, "PHONE"],
    [ActivityType.EMAIL, "EMAIL"],
    [ActivityType.MEETING, "IN_PERSON_MEETING"],
    [ActivityType.TEXT, "TEXT"],
    [ActivityType.LINKED_IN, "LINKED_IN"],
    [ActivityType.FACEBOOK, "FACEBOOK"],
    // A note is not a channel and a fax has no touchpoint of its own.
    [ActivityType.NOTE, "OTHER"],
    [ActivityType.FAX, "OTHER"],
    [ActivityType.OTHER, "OTHER"],
  ])(
    "maps a %s activity to a %s touchpoint",
    async (activityType, expected) => {
      await logActivity(service, { activityType });

      expect(tx.marketing.create.mock.calls[0][0].data.touchpoints).toEqual([
        expected,
      ]);
    }
  );

  it("marks a bulk send as an email blast", async () => {
    await logActivity(service, {
      activityType: ActivityType.EMAIL,
      isBulkSend: true,
    });

    expect(tx.marketing.create.mock.calls[0][0].data.touchpoints).toEqual([
      "EMAIL_BLAST",
    ]);
  });

  it("leaves the facility FK unset for a non-LEAD record", async () => {
    mocked.board.findFirst.mockResolvedValue({
      recordName: RECORD_NAME,
      moduleType: "REFERRAL",
    });

    await logActivity(service);

    expect(
      tx.marketing.create.mock.calls[0][0].data.facilityRecordId
    ).toBeNull();
  });

  it("writes nothing for a member who is not a liaison", async () => {
    mocked.member.findFirst.mockResolvedValue({ id: MEMBER, role: "owner" });

    await logActivity(service);

    expect(tx.marketing.create).not.toHaveBeenCalled();
  });

  it("writes nothing when the record is outside the organization", async () => {
    mocked.board.findFirst.mockResolvedValue(null);

    await logActivity(service);

    expect(tx.marketing.create).not.toHaveBeenCalled();
  });

  it("swallows a failure so the board action still stands", async () => {
    const logged = jest.spyOn(Logger.prototype, "error").mockImplementation();
    mocked.member.findFirst.mockRejectedValue(new Error("db down"));

    await expect(logActivity(service)).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
