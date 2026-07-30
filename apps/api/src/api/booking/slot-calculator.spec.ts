import {
  computeAvailableSlots,
  overlaps,
  zonedWallClockToUtc,
} from "./slot-calculator";

describe("zonedWallClockToUtc", () => {
  it("converts wall-clock to UTC correctly for the UTC zone itself", () => {
    const result = zonedWallClockToUtc(2026, 7, 29, 12, 0, "UTC");
    expect(result.toISOString()).toBe("2026-07-29T12:00:00.000Z");
  });

  it("converts wall-clock to UTC for a fixed-offset-in-summer zone (America/Chicago, CDT = UTC-5)", () => {
    const result = zonedWallClockToUtc(2026, 7, 29, 12, 0, "America/Chicago");
    expect(result.toISOString()).toBe("2026-07-29T17:00:00.000Z");
  });

  it("converges within the 3-iteration cap across the spring-forward gap (2026-03-08, America/New_York) without throwing", () => {
    // 2:30am does not exist on this date (clocks jump 2:00 -> 3:00). The
    // algorithm must still terminate and return a plausible, deterministic result.
    expect(() =>
      zonedWallClockToUtc(2026, 3, 8, 2, 30, "America/New_York")
    ).not.toThrow();

    const nonExistent = zonedWallClockToUtc(
      2026,
      3,
      8,
      2,
      30,
      "America/New_York"
    );
    // Deterministic: repeated calls converge to the same fixed point.
    const again = zonedWallClockToUtc(2026, 3, 8, 2, 30, "America/New_York");
    expect(nonExistent.toISOString()).toBe(again.toISOString());

    // Times either side of the gap must still resolve to their known correct offsets.
    const beforeGap = zonedWallClockToUtc(2026, 3, 8, 1, 0, "America/New_York");
    expect(beforeGap.toISOString()).toBe("2026-03-08T06:00:00.000Z"); // EST = UTC-5
    const afterGap = zonedWallClockToUtc(2026, 3, 8, 3, 0, "America/New_York");
    expect(afterGap.toISOString()).toBe("2026-03-08T07:00:00.000Z"); // EDT = UTC-4
  });

  it("does not throw and picks one consistent answer across the fall-back repeated hour (2026-11-01, America/New_York)", () => {
    // 1:30am occurs twice (once EDT, once EST) on this date.
    expect(() =>
      zonedWallClockToUtc(2026, 11, 1, 1, 30, "America/New_York")
    ).not.toThrow();

    const first = zonedWallClockToUtc(2026, 11, 1, 1, 30, "America/New_York");
    const second = zonedWallClockToUtc(2026, 11, 1, 1, 30, "America/New_York");
    expect(first.toISOString()).toBe(second.toISOString());
  });
});

describe("overlaps", () => {
  const t = (iso: string) => new Date(iso);

  it("returns false when A ends exactly where B starts (adjacent, not overlapping)", () => {
    expect(
      overlaps(
        t("2026-01-01T09:00:00Z"),
        t("2026-01-01T09:30:00Z"),
        t("2026-01-01T09:30:00Z"),
        t("2026-01-01T10:00:00Z")
      )
    ).toBe(false);
  });

  it("returns true for a genuine partial overlap", () => {
    expect(
      overlaps(
        t("2026-01-01T09:00:00Z"),
        t("2026-01-01T09:30:00Z"),
        t("2026-01-01T09:15:00Z"),
        t("2026-01-01T09:45:00Z")
      )
    ).toBe(true);
  });

  it("returns true for identical ranges", () => {
    expect(
      overlaps(
        t("2026-01-01T09:00:00Z"),
        t("2026-01-01T09:30:00Z"),
        t("2026-01-01T09:00:00Z"),
        t("2026-01-01T09:30:00Z")
      )
    ).toBe(true);
  });
});

describe("computeAvailableSlots", () => {
  // 2026-07-29 is a Wednesday (dayOfWeek 3).
  const baseInput = {
    date: "2026-07-29",
    timezone: "UTC",
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    minNoticeHours: 0,
    now: new Date("2026-01-01T00:00:00Z"),
  };

  it("splits an availability window into two chunks around a busy interval in the middle", () => {
    const slots = computeAvailableSlots({
      ...baseInput,
      availability: [{ dayOfWeek: 3, startMinute: 9 * 60, endMinute: 11 * 60 }],
      busy: [
        {
          start: new Date("2026-07-29T09:45:00Z"),
          end: new Date("2026-07-29T09:50:00Z"),
        },
      ],
    });

    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-07-29T09:00:00.000Z",
      "2026-07-29T10:00:00.000Z",
      "2026-07-29T10:30:00.000Z",
    ]);
  });

  it("excludes a slot only once a buffer makes it reach into a busy interval", () => {
    const window = {
      availability: [{ dayOfWeek: 3, startMinute: 9 * 60, endMinute: 10 * 60 }],
      busy: [
        {
          start: new Date("2026-07-29T10:00:00Z"),
          end: new Date("2026-07-29T10:15:00Z"),
        },
      ],
    };

    const withoutBuffer = computeAvailableSlots({ ...baseInput, ...window });
    expect(withoutBuffer.map((s) => s.toISOString())).toEqual([
      "2026-07-29T09:00:00.000Z",
      "2026-07-29T09:30:00.000Z",
    ]);

    const withBuffer = computeAvailableSlots({
      ...baseInput,
      ...window,
      bufferAfterMinutes: 20,
    });
    expect(withBuffer.map((s) => s.toISOString())).toEqual([
      "2026-07-29T09:00:00.000Z",
    ]);
  });

  it("filters out slots earlier than the minimum notice period", () => {
    const slots = computeAvailableSlots({
      ...baseInput,
      minNoticeHours: 1,
      now: new Date("2026-07-29T09:15:00Z"),
      availability: [{ dayOfWeek: 3, startMinute: 9 * 60, endMinute: 11 * 60 }],
      busy: [],
    });

    // earliestStart is 10:15, so only the 10:30 slot clears it.
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-07-29T10:30:00.000Z",
    ]);
  });

  it("returns no slots when there is no availability rule for that day of week", () => {
    const slots = computeAvailableSlots({
      ...baseInput,
      availability: [{ dayOfWeek: 4, startMinute: 9 * 60, endMinute: 11 * 60 }],
      busy: [],
    });

    expect(slots).toEqual([]);
  });
});
