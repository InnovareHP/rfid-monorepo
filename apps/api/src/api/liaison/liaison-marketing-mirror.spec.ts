import { BadRequestException } from "@nestjs/common";

// The service imports the prisma singleton directly, so the module is mocked
// and the transaction callback is handed a set of capturing delegates.
jest.mock("../../lib/prisma/prisma", () => {
  const tx = {
    marketing: {
      create: jest.fn().mockResolvedValue({ id: "marketing-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
    activity: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    history: { create: jest.fn().mockResolvedValue({}) },
  };

  return {
    prisma: {
      board: { findMany: jest.fn().mockResolvedValue([]) },
      marketing: {
        findFirst: jest.fn().mockResolvedValue({ id: "marketing-1" }),
        findUniqueOrThrow: jest.fn(),
      },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});

import { prisma } from "../../lib/prisma/prisma";
import { LiaisonService } from "./liaison.service";

const ORG = "org-a";
const USER = "user-1";
const MEMBER = "member-1";
const FACILITY = "Sunrise Care";
const RECORD_ID = "record-1";

const mocked = prisma as unknown as {
  board: { findMany: jest.Mock };
  marketing: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock };
  __tx: {
    marketing: { create: jest.Mock; update: jest.Mock };
    activity: { create: jest.Mock; update: jest.Mock };
    history: { create: jest.Mock };
  };
};

const tx = mocked.__tx;

function createMarketing(
  service: LiaisonService,
  overrides: Partial<{
    touchpoint: string[];
    notes: string;
    reasonForVisit: string;
  }> = {}
) {
  return service.createMarketing(
    {
      facility: FACILITY,
      touchpoint: ["IN_PERSON_MEETING"],
      talkedTo: "Front desk",
      ...overrides,
    } as never,
    MEMBER,
    USER,
    ORG
  );
}

describe("LiaisonService.createMarketing board mirror", () => {
  let service: LiaisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    mocked.board.findMany.mockResolvedValue([
      { id: RECORD_ID, recordName: FACILITY },
    ]);
    service = new LiaisonService();
  });

  it("mirrors the log as a completed activity on the facility record", async () => {
    await createMarketing(service, {
      reasonForVisit: "Quarterly check-in",
      notes: "Asked for referral packets",
    });

    expect(tx.activity.create).toHaveBeenCalledTimes(1);
    expect(tx.activity.create.mock.calls[0][0].data).toMatchObject({
      title: "Marketing touchpoint: Quarterly check-in",
      description:
        "IN_PERSON_MEETING - talked to Front desk - Asked for referral packets",
      activityType: "MEETING",
      status: "COMPLETED",
      recordId: RECORD_ID,
      marketingId: "marketing-1",
      createdBy: USER,
      organizationId: ORG,
    });
    expect(tx.activity.create.mock.calls[0][0].data.completedAt).toBeInstanceOf(
      Date
    );
  });

  it.each([
    ["PHONE", "CALL"],
    ["EMAIL", "EMAIL"],
    ["IN_PERSON_MEETING", "MEETING"],
    // Each channel keeps its identity now. These four used to collapse to NOTE.
    ["TEXT", "TEXT"],
    ["LINKED_IN", "LINKED_IN"],
    ["FACEBOOK", "FACEBOOK"],
    ["OTHER", "OTHER"],
    // The one pair that stays lossy: a blast is a marketing send, and the
    // board activity for it is an email.
    ["EMAIL_BLAST", "EMAIL"],
  ])(
    "maps the %s touchpoint to a %s activity",
    async (touchpoint, expected) => {
      await createMarketing(service, { touchpoint: [touchpoint] });

      expect(tx.activity.create.mock.calls[0][0].data.activityType).toBe(
        expected
      );
    }
  );

  it("types the activity from the first touchpoint and names the rest", async () => {
    await createMarketing(service, { touchpoint: ["PHONE", "EMAIL"] });

    const data = tx.activity.create.mock.calls[0][0].data;
    expect(data.activityType).toBe("CALL");
    expect(data.description).toBe("PHONE, EMAIL - talked to Front desk");
  });

  it("falls back to a plain title when no reason for the visit is given", async () => {
    await createMarketing(service);

    expect(tx.activity.create.mock.calls[0][0].data).toMatchObject({
      title: "Marketing touchpoint",
      description: "IN_PERSON_MEETING - talked to Front desk",
    });
  });

  it("scopes the history row to the organization", async () => {
    await createMarketing(service);

    expect(tx.history.create.mock.calls[0][0].data).toMatchObject({
      recordId: RECORD_ID,
      organizationId: ORG,
      column: "marketing",
    });
  });

  it("writes nothing when the facility matches no lead in the organization", async () => {
    mocked.board.findMany.mockResolvedValue([
      { id: "other-record", recordName: "A Different Facility" },
    ]);

    await expect(createMarketing(service)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(tx.marketing.create).not.toHaveBeenCalled();
    expect(tx.activity.create).not.toHaveBeenCalled();
  });
});

describe("LiaisonService.updateMarketing board mirror", () => {
  let service: LiaisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    mocked.board.findMany.mockResolvedValue([
      { id: RECORD_ID, recordName: FACILITY },
    ]);
    mocked.marketing.findFirst.mockResolvedValue({ id: "marketing-1" });
    mocked.marketing.findUniqueOrThrow.mockResolvedValue({
      facility: FACILITY,
      touchpoints: ["IN_PERSON_MEETING"],
      talkedTo: "Front desk",
      notes: null,
      reasonForVisit: null,
      activity: { id: "activity-1" },
    });
    service = new LiaisonService();
  });

  it("rewrites the mirrored activity from the edited log", async () => {
    await service.updateMarketing(
      "marketing-1",
      { touchpoint: ["PHONE"], notes: "Left a voicemail" } as never,
      ORG,
      MEMBER
    );

    expect(tx.activity.update).toHaveBeenCalledTimes(1);
    expect(tx.activity.update.mock.calls[0][0]).toMatchObject({
      where: { id: "activity-1" },
      data: {
        description: "PHONE - talked to Front desk - Left a voicemail",
        activityType: "CALL",
        recordId: RECORD_ID,
      },
    });
  });

  it("leaves fields the edit omitted untouched", async () => {
    await service.updateMarketing(
      "marketing-1",
      { notes: "Dropped off packets" } as never,
      ORG,
      MEMBER
    );

    expect(tx.marketing.update.mock.calls[0][0].data).toMatchObject({
      facility: FACILITY,
      touchpoints: ["IN_PERSON_MEETING"],
      talkedTo: "Front desk",
      facilityRecordId: RECORD_ID,
    });
  });

  it("skips the activity update for a log that has no mirror", async () => {
    mocked.marketing.findUniqueOrThrow.mockResolvedValue({
      facility: FACILITY,
      touchpoints: ["OTHER"],
      talkedTo: "Front desk",
      notes: null,
      reasonForVisit: null,
      activity: null,
    });

    await service.updateMarketing(
      "marketing-1",
      { notes: "Legacy row" } as never,
      ORG,
      MEMBER
    );

    expect(tx.marketing.update).toHaveBeenCalledTimes(1);
    expect(tx.activity.update).not.toHaveBeenCalled();
  });
});
