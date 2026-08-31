import { BadRequestException } from "@nestjs/common";

// The service imports the prisma singleton directly, so the module is mocked
// and the transaction callback is handed a set of capturing delegates.
jest.mock("../../lib/prisma/prisma", () => {
  const tx = {
    marketing: { create: jest.fn().mockResolvedValue({}) },
    activity: { create: jest.fn().mockResolvedValue({}) },
    history: { create: jest.fn().mockResolvedValue({}) },
  };

  return {
    prisma: {
      board: { findMany: jest.fn().mockResolvedValue([]) },
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
  __tx: {
    marketing: { create: jest.Mock };
    activity: { create: jest.Mock };
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
      description: "Talked to Front desk - Asked for referral packets",
      activityType: "MEETING",
      status: "COMPLETED",
      recordId: RECORD_ID,
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
    ["TEXT", "NOTE"],
    ["LINKED_IN", "NOTE"],
    ["FACEBOOK", "NOTE"],
    ["OTHER", "NOTE"],
  ])(
    "maps the %s touchpoint to a %s activity",
    async (touchpoint, expected) => {
      await createMarketing(service, { touchpoint: [touchpoint] });

      expect(tx.activity.create.mock.calls[0][0].data.activityType).toBe(
        expected
      );
    }
  );

  it("types the activity from the first touchpoint when several are logged", async () => {
    await createMarketing(service, { touchpoint: ["PHONE", "EMAIL"] });

    expect(tx.activity.create.mock.calls[0][0].data.activityType).toBe("CALL");
  });

  it("falls back to a plain title when no reason for the visit is given", async () => {
    await createMarketing(service);

    expect(tx.activity.create.mock.calls[0][0].data).toMatchObject({
      title: "Marketing touchpoint",
      description: "Talked to Front desk",
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
