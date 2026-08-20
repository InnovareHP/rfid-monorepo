export const NOTIFICATION_TYPE = {
  TASK_ASSIGNED: "task.assigned",
  TASK_COMMENTED: "task.commented",
  TASK_COMPLETED: "task.completed",
  TASK_DUE_SOON: "task.due_soon",
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled",
} as const;

export type NotificationTypeValue =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// Board events are shared by every EAV module, so the event is stored as a
// suffix and the module supplies the prefix that decides the category.
export const BOARD_NOTIFICATION_EVENT = {
  CREATED: "created",
  ASSIGNED: "assigned",
  STATUS_CHANGED: "status_changed",
  LINKED: "linked",
  DELETED: "deleted",
  RESTORED: "restored",
  ACTIVITY_LOGGED: "activity_logged",
  ACTIVITY_COMPLETED: "activity_completed",
  FAX_SENT: "fax_sent",
  EMAIL_RECEIVED: "email_received",
  BULK_EMAIL_FINISHED: "bulk_email_finished",
  IMPORT_FINISHED: "import_finished",
} as const;

export type BoardNotificationEvent =
  (typeof BOARD_NOTIFICATION_EVENT)[keyof typeof BOARD_NOTIFICATION_EVENT];

export const boardNotificationType = (
  moduleType: string,
  event: BoardNotificationEvent
) => `${moduleType.toLowerCase()}.${event}`;

export const NOTIFICATION_ENTITY = {
  TASK: "TASK",
  LEAD: "LEAD",
  REFERRAL: "REFERRAL",
  CONTACT: "CONTACT",
  COMPANY: "COMPANY",
  BOOKING: "BOOKING",
} as const;

export const NOTIFICATION_CATEGORY = {
  ALL: "all",
  TASKS: "tasks",
  REFERRALS: "referrals",
  MARKETING: "marketing",
  BOOKING: "booking",
} as const;

export type NotificationCategoryValue =
  (typeof NOTIFICATION_CATEGORY)[keyof typeof NOTIFICATION_CATEGORY];

// A category is the part of the type before the dot, so a new feature gets
// filed correctly by naming its type rather than by editing a lookup table.
const CATEGORY_PREFIXES: Record<
  Exclude<NotificationCategoryValue, "all">,
  string[]
> = {
  tasks: ["task"],
  referrals: ["referral", "lead", "contact", "company"],
  marketing: ["blast", "campaign", "form", "landing"],
  booking: ["booking"],
};

export const categoryPrefixes = (category: NotificationCategoryValue) =>
  category === "all" ? [] : CATEGORY_PREFIXES[category];

export type NotificationEntityValue =
  (typeof NOTIFICATION_ENTITY)[keyof typeof NOTIFICATION_ENTITY];

export type NotificationActorDto = {
  id: string;
  name: string;
  image: string | null;
};

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActorDto | null;
};

export type NotificationListQuery = {
  unreadOnly?: boolean;
  category?: NotificationCategoryValue;
  search?: string;
  page?: number;
  limit?: number;
};

export type UnreadCountDto = {
  count: number;
};

export type NotificationStatsDto = {
  total: number;
  unread: number;
  thisWeek: number;
};
