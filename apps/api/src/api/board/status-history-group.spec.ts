// A status change also stamps its reason and its action date. Those two writes
// used to leave no history at all, so the timeline showed a status moving with
// no record of why. All three now share a groupId.
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));

jest.mock("./board.gateway", () => ({ BoardGateway: jest.fn() }));

jest.mock("../../lib/prisma/prisma", () => ({ prisma: {} }));

jest.mock("../../lib/module/system-modules", () => ({
  resolveModuleId: jest.fn().mockResolvedValue("module-referral"),
  toModuleType: jest.fn(),
}));

jest.mock("src/lib/redis/redis", () => ({
  cacheData: jest.fn(),
  deleteData: jest.fn(),
  getData: jest.fn(),
  purgeBoardCaches: jest.fn(),
}));

import { BoardFieldType } from "@prisma/client";
import { BoardService } from "./board.service";

const ORG = "org-a";
const RECORD = "record-1";
const MEMBER = "member-1";
const STATUS_FIELD = "field-status";
const REASON_FIELD = "field-reason";
const ACTION_DATE_FIELD = "field-action-date";

type HistoryRow = {
  column: string;
  oldValue: string;
  newValue: string;
  groupId: string | null;
};

const buildTx = () => {
  const created: HistoryRow[] = [];

  const tx = {
    field: {
      findMany: jest.fn().mockResolvedValue([
        { id: REASON_FIELD, fieldName: "Reason" },
        { id: ACTION_DATE_FIELD, fieldName: "Action Date" },
      ]),
    },
    fieldValue: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ fieldId: STATUS_FIELD, value: "Pending" }]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    history: {
      create: jest.fn(({ data }) => {
        created.push(data);
        return Promise.resolve(data);
      }),
    },
    board: { findUnique: jest.fn() },
  };

  return { tx, created };
};

const service = () =>
  new BoardService(
    { emitRecordValueStatusUpdated: jest.fn() } as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never
  );

const run = async (reason?: string) => {
  const { tx, created } = buildTx();

  await (
    service() as unknown as {
      updateStatusValue: (tx: unknown, ctx: unknown) => Promise<unknown>;
    }
  ).updateStatusValue(tx, {
    recordId: RECORD,
    value: "Denied",
    organizationId: ORG,
    moduleType: "REFERRAL",
    reason,
    memberId: MEMBER,
    field: {
      id: STATUS_FIELD,
      fieldName: "Admission Status",
      fieldType: BoardFieldType.STATUS,
    },
  });

  return created;
};

describe("status change history", () => {
  beforeEach(() => jest.clearAllMocks());

  it("writes the status, its reason and its action date under one group", async () => {
    const rows = await run("Patient did not show");

    expect(rows.map((row) => row.column)).toEqual([
      "Admission Status",
      "Reason",
      "Action Date",
    ]);

    const [groupId] = rows.map((row) => row.groupId);
    expect(groupId).toEqual(expect.any(String));
    expect(rows.every((row) => row.groupId === groupId)).toBe(true);
  });

  it("carries the previous status across so the timeline reads old to new", async () => {
    const [status] = await run("Patient did not show");

    expect(status).toMatchObject({ oldValue: "Pending", newValue: "Denied" });
  });

  it("records the reason as its own change", async () => {
    const rows = await run("Patient did not show");
    const reason = rows.find((row) => row.column === "Reason");

    expect(reason).toMatchObject({
      oldValue: "",
      newValue: "Patient did not show",
    });
  });

  // No reason given is not a reason of empty string - it must not overwrite.
  it("omits the reason row when the change carried none", async () => {
    const rows = await run();

    expect(rows.map((row) => row.column)).toEqual([
      "Admission Status",
      "Action Date",
    ]);
    expect(new Set(rows.map((row) => row.groupId)).size).toBe(1);
  });

  it("gives each change its own group", async () => {
    const first = await run("one");
    const second = await run("two");

    expect(first[0].groupId).not.toBe(second[0].groupId);
  });
});
