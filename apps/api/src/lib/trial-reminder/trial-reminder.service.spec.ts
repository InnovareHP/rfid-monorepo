const findMany = jest.fn();
const set = jest.fn();
const del = jest.fn();
const queueTrialEndingEmail = jest.fn();

jest.mock("../prisma/prisma", () => ({
  prisma: { subscription: { findMany: (...a: unknown[]) => findMany(...a) } },
}));
jest.mock("../redis/redis", () => ({
  redis: {
    set: (...a: unknown[]) => set(...a),
    del: (...a: unknown[]) => del(...a),
  },
}));
jest.mock("../stripe/plans", () => ({ getPlan: () => ({ label: "Pro" }) }));
jest.mock("../stripe/stripe-events", () => ({
  queueTrialEndingEmail: (...a: unknown[]) => queueTrialEndingEmail(...a),
}));

import { TrialReminderService } from "./trial-reminder.service";

const now = new Date("2026-10-14T12:00:00Z");
const row = {
  id: "sub-1",
  plan: "pro",
  stripeCustomerId: "cus_1",
  trialEnd: new Date("2026-10-15T06:00:00Z"),
};

beforeEach(() => {
  [findMany, set, del, queueTrialEndingEmail].forEach((fn) => fn.mockReset());
});

describe("TrialReminderService.sweep", () => {
  it("queries only trials ending within the next day", async () => {
    findMany.mockResolvedValue([]);
    await new TrialReminderService().sweep(now);
    expect(findMany.mock.calls[0][0].where.trialEnd).toEqual({
      gt: now,
      lte: new Date("2026-10-15T12:00:00Z"),
    });
  });

  it("sends once per trial and skips one already claimed", async () => {
    findMany.mockResolvedValue([row, { ...row, id: "sub-2" }]);
    set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);
    await expect(new TrialReminderService().sweep(now)).resolves.toBe(1);
    expect(queueTrialEndingEmail).toHaveBeenCalledWith(
      "cus_1",
      row.trialEnd.getTime() / 1000,
      "Pro",
      now.getTime() / 1000
    );
  });

  it("releases the claim when queueing fails so the next sweep retries", async () => {
    findMany.mockResolvedValue([row]);
    set.mockResolvedValue("OK");
    queueTrialEndingEmail.mockRejectedValue(new Error("redis down"));
    await expect(new TrialReminderService().sweep(now)).rejects.toThrow();
    expect(del).toHaveBeenCalledWith("trial-reminder:sub-1");
  });
});
