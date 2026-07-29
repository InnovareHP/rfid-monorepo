// Timezone-aware slot calculation for booking pages, using only Intl (no date library dependency).

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type BusyInterval = {
  start: Date;
  end: Date;
};

export type ComputeSlotsInput = {
  date: string;
  timezone: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeHours: number;
  availability: AvailabilityRuleInput[];
  busy: BusyInterval[];
  now?: Date;
};

// Direction 1: local wall-clock (Y,M,D,h,m) in an IANA zone -> a real UTC Date.
// No native reverse lookup exists, so guess, measure the error, and correct — iterating
// to a fixed point handles DST transitions correctly (this is what date-fns-tz/Luxon do internally).
function getZonedParts(utcMillis: number, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(utcMillis)).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour === "24" ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const targetAsUtcMillis = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guess = targetAsUtcMillis;
  for (let i = 0; i < 3; i++) {
    const zoned = getZonedParts(guess, timeZone);
    const zonedAsUtcMillis = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      0,
      0
    );
    const diff = zonedAsUtcMillis - targetAsUtcMillis;
    if (diff === 0) break;
    guess -= diff;
  }
  return new Date(guess);
}

// Direction 2: a UTC Date -> which day-of-week/minute-of-day it is in an IANA zone.
// formatToParts with weekday gives this directly, no reconciliation needed.
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function utcToZonedWeekdayMinute(
  utcDate: Date,
  timeZone: string
): { dayOfWeek: number; minuteOfDay: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(utcDate).map((p) => [p.type, p.value])
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    dayOfWeek: WEEKDAY_INDEX[parts.weekday],
    minuteOfDay: hour * 60 + Number(parts.minute),
  };
}

export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Computes bookable UTC slot start times for a single calendar date in the page's timezone.
export function computeAvailableSlots(input: ComputeSlotsInput): Date[] {
  const {
    date,
    timezone,
    durationMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    minNoticeHours,
    availability,
    busy,
    now = new Date(),
  } = input;

  const [year, month, day] = date.split("-").map(Number);
  const zonedWeekday = utcToZonedWeekdayMinute(
    zonedWallClockToUtc(year, month, day, 12, 0, timezone),
    timezone
  ).dayOfWeek;

  const rulesForDay = availability.filter((r) => r.dayOfWeek === zonedWeekday);
  if (rulesForDay.length === 0) return [];

  const earliestStart = new Date(
    now.getTime() + minNoticeHours * 60 * 60 * 1000
  );
  const slots: Date[] = [];

  for (const rule of rulesForDay) {
    for (
      let minute = rule.startMinute;
      minute + durationMinutes <= rule.endMinute;
      minute += durationMinutes
    ) {
      const hour = Math.floor(minute / 60);
      const min = minute % 60;
      const slotStart = zonedWallClockToUtc(
        year,
        month,
        day,
        hour,
        min,
        timezone
      );
      const slotEnd = new Date(
        slotStart.getTime() + durationMinutes * 60 * 1000
      );

      if (slotStart < earliestStart) continue;

      const bufferedStart = new Date(
        slotStart.getTime() - bufferBeforeMinutes * 60 * 1000
      );
      const bufferedEnd = new Date(
        slotEnd.getTime() + bufferAfterMinutes * 60 * 1000
      );

      const isBusy = busy.some((b) =>
        overlaps(bufferedStart, bufferedEnd, b.start, b.end)
      );
      if (isBusy) continue;

      slots.push(slotStart);
    }
  }

  return slots;
}

export { utcToZonedWeekdayMinute, zonedWallClockToUtc };
