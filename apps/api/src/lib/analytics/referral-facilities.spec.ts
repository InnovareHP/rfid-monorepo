// A referral reaches its facility two ways. Interactive edits write a
// BoardRelation; an imported log only ever carried the facility name in the
// cell. Reading relations alone dropped every imported row, which is what this
// pins - both the referral analytics and the liaison report depend on it.
jest.mock("../prisma/prisma", () => ({
  prisma: {
    board: { findMany: jest.fn() },
    boardRelation: { findMany: jest.fn() },
    fieldValue: { findMany: jest.fn() },
  },
}));

jest.mock("../crypto/record-name-index", () => ({
  recordNameIndex: (value: string) => `hash:${value}`,
}));

import { prisma } from "../prisma/prisma";
import { resolveReferralFacilities } from "./referral-facilities";

const ORG = "org-a";
const MANAGER = "user-manager";

const db = prisma as unknown as {
  board: { findMany: jest.Mock };
  boardRelation: { findMany: jest.Mock };
  fieldValue: { findMany: jest.Mock };
};

type Lead = {
  id: string;
  name: string;
  accountManager?: string | null;
  county?: string | null;
};

const setup = (args: {
  leads?: Lead[];
  relations?: Record<string, string>;
  cells?: Record<string, string>;
}) => {
  const { leads = [], relations = {}, cells = {} } = args;

  db.boardRelation.findMany.mockResolvedValue(
    Object.entries(relations).map(([sourceId, targetId]) => ({
      sourceId,
      targetId,
    }))
  );

  db.fieldValue.findMany.mockResolvedValue(
    Object.entries(cells).map(([recordId, value]) => ({ recordId, value }))
  );

  db.board.findMany.mockResolvedValue(
    leads.map((lead) => ({
      id: lead.id,
      recordName: lead.name,
      recordNameHash: `hash:${lead.name}`,
      assignedTo: lead.accountManager ?? null,
      values: lead.county ? [{ value: lead.county }] : [],
    }))
  );
};

const run = () => resolveReferralFacilities(ORG);

describe("resolveReferralFacilities", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves a referral through its BoardRelation", async () => {
    setup({
      leads: [{ id: "f1", name: "Sunrise", accountManager: MANAGER }],
      relations: { r1: "f1" },
    });

    const facilities = await run();

    expect(facilities.get("r1")).toMatchObject({
      id: "f1",
      recordName: "Sunrise",
      accountManager: MANAGER,
    });
  });

  it("resolves an imported referral by the name in its cell", async () => {
    setup({
      leads: [{ id: "f1", name: "Sunrise", accountManager: MANAGER }],
      cells: { r1: "Sunrise" },
    });

    const facilities = await run();

    expect(facilities.get("r1")?.id).toBe("f1");
  });

  it("resolves a cell holding the record id rather than the name", async () => {
    setup({ leads: [{ id: "f1", name: "Sunrise" }], cells: { r1: "f1" } });

    expect((await run()).get("r1")?.id).toBe("f1");
  });

  // The relation is authoritative: a stale cell must not override it.
  it("prefers the relation when a referral has both", async () => {
    setup({
      leads: [
        { id: "f1", name: "Sunrise" },
        { id: "f2", name: "Lakeside" },
      ],
      relations: { r1: "f1" },
      cells: { r1: "Lakeside" },
    });

    expect((await run()).get("r1")?.id).toBe("f1");
  });

  it("carries the county and the account manager through", async () => {
    setup({
      leads: [
        {
          id: "f1",
          name: "Sunrise",
          accountManager: MANAGER,
          county: "Sangamon",
        },
      ],
      relations: { r1: "f1" },
    });

    expect(await run().then((f) => f.get("r1"))).toEqual({
      id: "f1",
      recordName: "Sunrise",
      county: "Sangamon",
      accountManager: MANAGER,
    });
  });

  it("leaves out a referral whose facility does not resolve", async () => {
    setup({ leads: [], cells: { r1: "Nowhere" } });

    expect((await run()).size).toBe(0);
  });

  it("skips the lead lookup when nothing names a facility", async () => {
    setup({});

    expect((await run()).size).toBe(0);
    expect(db.board.findMany).not.toHaveBeenCalled();
  });
});
