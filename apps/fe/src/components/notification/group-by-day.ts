import type { NotificationDto } from "@dashboard/shared";

export type NotificationDayGroup = {
  label: "TODAY" | "YESTERDAY" | "EARLIER";
  items: NotificationDto[];
};

const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

const DAY = 24 * 60 * 60 * 1000;

// Groups the page in hand, so a group header only appears when that page
// actually contains a notification from that day.
export const groupByDay = (
  notifications: NotificationDto[]
): NotificationDayGroup[] => {
  const today = startOfDay(new Date());

  const buckets: NotificationDayGroup[] = [
    { label: "TODAY", items: [] },
    { label: "YESTERDAY", items: [] },
    { label: "EARLIER", items: [] },
  ];

  for (const notification of notifications) {
    const day = startOfDay(new Date(notification.createdAt));
    const index = day === today ? 0 : day === today - DAY ? 1 : 2;
    buckets[index].items.push(notification);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
};
