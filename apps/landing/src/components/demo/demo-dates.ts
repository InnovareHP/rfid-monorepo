// Local, not UTC: toISOString() rolls the day over for anyone west of GMT in
// the evening, which showed tomorrow as today on the calendar.
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export const fromDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const monthKey = (key: string) => key.slice(0, 7);

export const todayKey = () => toDateKey(new Date());
