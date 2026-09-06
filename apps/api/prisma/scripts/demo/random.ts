// Deterministic, so a demo rehearsed once looks the same when it is given.
let seed = 20260903;

export const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

export const pick = <T>(values: readonly T[]) =>
  values[Math.floor(random() * values.length)];

export const between = (min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

// Weeks back from today, so trends have shape instead of a flat line.
export const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
