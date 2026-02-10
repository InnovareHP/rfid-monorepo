export const eventTypes = {
  subscriptionCreated: "subscription.created",
  subscriptionUpdated: "subscription.updated",
  subscriptionDeleted: "subscription.deleted",
  subscriptionExpired: "subscription.expired",
  subscriptionCanceled: "subscription.canceled",
  subscriptionPaused: "subscription.paused",
  subscriptionUnpaused: "subscription.unpaused",
} as const;

export type LiaisonAnalytics = {
  memberId: string;
  memberName: string;
  // Lead metrics
  totalLeads: number;
  newLeads: number;

  // Marketing metrics
  totalInteractions: number;
  engagementLevel: "High" | "Medium" | "Low";
  facilitiesCovered: string[];
  touchpointsUsed: { type: string; count: number }[];
  peopleContacted: string[];
};

export type ParsedLocation = {
  city: string | null;
  state: string | null;
  county: string | null;
  country: string | null;
  zip?: string | null;
  address: string;
};
