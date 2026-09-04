// A liaison's referrals split by who manages the facility they came from:
// referral -> facility -> Account Manager (Board.assignedTo on the LEAD).
jest.mock("bullmq", () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Worker: jest.fn(),
}));

jest.mock("../../lib/prisma/prisma", () => ({
  prisma: {
    board: { findMany: jest.fn() },
    boardRelation: { findMany: jest.fn() },
    fieldValue: { findMany: jest.fn() },
  },
}));

jest.mock("../../lib/crypto/record-name-index", () => ({
  recordNameIndex: (value: string) => `hash:${value}`,
}));

import { prisma } from "../../lib/prisma/prisma";
import { AnalyticsService } from "./analytics.service";

const ORG = "org-a";
const LIAISON = "user-liaison";
const OTHER = "user-other";

const db = prisma as unknown as {
  board: { findMany: jest.Mock };
  boardRelation: { findMany: jest.Mock };
  fieldValue: { findMany: jest.Mock };
};

type Referral = { id: string; assignedTo: string | null; status?: string };
type Lead = { id: string; name: string; accountManager: string | null };

const setup = (args: {
  referrals: Referral[];
  leads?: Lead[];
  // referralId -> leadId, the BoardRelation path
  relations?: Record<string, string>;
  // referralId -> cell contents, the imported path
  cells?: Record<string, string>;
}) => {
  const { referrals, leads = [], relations = {}, cells = {} } = args;

  // Keyed on the query rather than call order: the lead lookup is skipped
  // entirely when no referral names a facility, so a sequence would drift.
  db.board.findMany.mockImplementation(
    ({ where }: { where: { moduleType: string } }) =>
      Promise.resolve(
        where.moduleType === "REFERRAL"
          ? referrals.map((referral) => ({
              id: referral.id,
              assignedTo: referral.assignedTo,
              values: referral.status ? [{ value: referral.status }] : [],
            }))
          : leads.map((lead) => ({
              id: lead.id,
              recordName: lead.name,
              recordNameHash: `hash:${lead.name}`,
              assignedTo: lead.accountManager,
              values: [],
            }))
      )
  );

  db.boardRelation.findMany.mockResolvedValue(
    Object.entries(relations).map(([sourceId, targetId]) => ({
      sourceId,
      targetId,
    }))
  );

  db.fieldValue.findMany.mockResolvedValue(
    Object.entries(cells).map(([recordId, value]) => ({ recordId, value }))
  );
};

const run = () =>
  new AnalyticsService(null as never).getReferralCountsByLiaison(ORG);

describe("referrals by facility account manager", () => {
  beforeEach(() => jest.clearAllMocks());

  it("counts a referral from a facility the liaison manages as their own", async () => {
    setup({
      referrals: [{ id: "r1", assignedTo: LIAISON }],
      leads: [{ id: "f1", name: "Sunrise", accountManager: LIAISON }],
      relations: { r1: "f1" },
    });

    const { byUser } = await run();

    expect(byUser.get(LIAISON)).toMatchObject({
      referrals: 1,
      ownFacilityReferrals: 1,
      otherFacilityReferrals: 0,
    });
  });

  it("counts a referral from someone else's facility separately", async () => {
    setup({
      referrals: [{ id: "r1", assignedTo: LIAISON }],
      leads: [{ id: "f1", name: "Sunrise", accountManager: OTHER }],
      relations: { r1: "f1" },
    });

    const { byUser } = await run();

    expect(byUser.get(LIAISON)).toMatchObject({
      referrals: 1,
      ownFacilityReferrals: 0,
      otherFacilityReferrals: 1,
    });
  });

  // Imported referrals never got a BoardRelation - the facility only ever
  // lived in the cell. Reading relations alone would drop them from both.
  it("follows the facility named in the cell when there is no relation", async () => {
    setup({
      referrals: [{ id: "r1", assignedTo: LIAISON }],
      leads: [{ id: "f1", name: "Sunrise", accountManager: LIAISON }],
      cells: { r1: "Sunrise" },
    });

    const { byUser } = await run();

    expect(byUser.get(LIAISON)?.ownFacilityReferrals).toBe(1);
  });

  it("leaves a referral with no facility out of both counts", async () => {
    setup({ referrals: [{ id: "r1", assignedTo: LIAISON }] });

    const { byUser } = await run();

    expect(byUser.get(LIAISON)).toMatchObject({
      referrals: 1,
      ownFacilityReferrals: 0,
      otherFacilityReferrals: 0,
    });
  });

  it("leaves a facility nobody manages out of both counts", async () => {
    setup({
      referrals: [{ id: "r1", assignedTo: LIAISON }],
      leads: [{ id: "f1", name: "Sunrise", accountManager: null }],
      relations: { r1: "f1" },
    });

    const { byUser } = await run();

    expect(byUser.get(LIAISON)).toMatchObject({
      referrals: 1,
      ownFacilityReferrals: 0,
      otherFacilityReferrals: 0,
    });
  });

  it("keeps the split alongside the admission count", async () => {
    setup({
      referrals: [
        { id: "r1", assignedTo: LIAISON, status: "Admitted" },
        { id: "r2", assignedTo: LIAISON },
      ],
      leads: [
        { id: "f1", name: "Sunrise", accountManager: LIAISON },
        { id: "f2", name: "Lakeside", accountManager: OTHER },
      ],
      relations: { r1: "f1", r2: "f2" },
    });

    const { byUser, totals } = await run();

    expect(totals).toEqual({ referrals: 2, admissions: 1 });
    expect(byUser.get(LIAISON)).toEqual({
      referrals: 2,
      admissions: 1,
      ownFacilityReferrals: 1,
      otherFacilityReferrals: 1,
    });
  });
});
