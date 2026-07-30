export const NOTIFICATION_TYPE = {
  TASK_ASSIGNED: "task.assigned",
  TASK_COMMENTED: "task.commented",
  TASK_COMPLETED: "task.completed",
  TASK_DUE_SOON: "task.due_soon",
} as const;

export type NotificationTypeValue =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_ENTITY = {
  TASK: "TASK",
  LEAD: "LEAD",
  REFERRAL: "REFERRAL",
} as const;

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
  page?: number;
  limit?: number;
};

export type UnreadCountDto = {
  count: number;
};
