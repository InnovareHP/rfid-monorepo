import { Priority, TicketCategory, TicketStatus } from "./nums.js";

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
  totalLeads: number;
  newLeads: number;
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

export type User = {
  id: string;
  name: string;
  email: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
};

type UserTable = {
  id: string;
  user_name: string;
  user_email: string;
  user_image: string;
  user_created_at: Date;
  user_updated_at: Date;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: Priority;
  assignedTo: string;
  assignedToUser: User;
  createBy: string;
  createByUser: User;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberSession = {
  memberRole: string;
  activeOrganizationId: string;
};

export type LeadRow = {
  id: string;
  lead_name: string;
  status: string;
  activities_time: number;
  create_contact: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  last_interaction: string;
  active_sequences: number;
  has_notification: string;
  [key: string]: string | number;
};

export type ReferralRow = {
  id: string;
  [key: string]: string | number;
};

export type ColumnsType = {
  id: string;
  name: string;
  type: string;
};

export type ReferralResponse = {
  columns: ColumnsType[];
  data: ReferralRow;
};

export type ReferralHistoryRow = {
  id: string;
  created_at: string;
  created_by: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
};

export type ReferralHistoryResponse = {
  data: ReferralHistoryRow[];
  total: number;
};

export type LeadOptions = {
  id: string;
  value: string;
  assigned_to?: string[];
};

export type ReferralOptions = {
  id: string;
  value: string;
};

export type ReferralHistoryItem = {
  id: string;
  lead_id: string;
  created_at: string;
  created_by: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  field_name?: string;
  field_id?: string;
  message?: string;
};

export type LeadHistoryItem = {
  id: string;
  lead_id: string;
  created_at: string;
  created_by: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  field_name?: string;
  field_id?: string;
  message?: string;
};

export type CountyRow = {
  id: string;
  name: string;
  assigned_to: string;
};

export type AnalyticsResponse = {
  avgTime: AverageTime;
  clinicians: ClinicianAnalytics[];
  conversion: ConversionAnalytics;
  counties: CountyAnalytics[];
  discharge: DischargeAnalytics[];
  facilities: FacilityAnalytics[];
  outreach: OutreachAnalytics[];
  payers: PayerAnalytics[];
  sources: SourceAnalytics[];
  analytics: string;
};

export type AverageTime = {
  averageDays: string; // e.g. "3.4"
};

export type ConversionAnalytics = {
  totalReferrals: number;
  admitted: number;
  conversionRate: number; // percentage
};

export type FacilityAnalytics = {
  value: string | null;
  _count: {
    value: number;
  };
};

export type ClinicianAnalytics = {
  value: string | null;
  _count: {
    value: number;
  };
};

export type CountyAnalytics = {
  value: string | null;
  _count: {
    value: number;
  };
};

export type SourceAnalytics = {
  value: string | null;
  _count: {
    value: number;
  };
};

export type PayerAnalytics = {
  value: string | null;
  _count: {
    value: number;
  };
};

export type DischargeAnalytics = {
  month: string; // e.g. "2025-11"
  total: number;
};

export type OutreachAnalytics = {
  facility: string | null;
  recent_referrals: number;
};

export type OptionsResponse = {
  id: string;
  value: string;
};

export type Subscription = {
  cancelAtPeriodEnd: boolean;
  id: string;
  limits: { seats: number };
  periodEnd: string;
  periodStart: string;
  plan: string;
  priceId: string;
  referenceId: string;
  seats: number;
  status: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
};

export type Organization = {
  id?: string;
  name: string;
  logo?: string | null;
  slug: string;
  createdAt: Date;
  metadata?: any;
};

export type MileageLogRow = {
  id: string;
  createdAt: string;
  destination: string;
  countiesMarketed: string;
  beginningMileage: number;
  endingMileage: number;
  totalMiles: number;
  rateType: string;
  ratePerMile: number;
  reimbursementAmount: number;
};

export type LeadAnalyze = {
  recordId: string;
  assignedTo: string;
  recordName: string;
  summary: {
    totalInteractions: number;
    facilitiesCovered: string[];
    touchpointsUsed: { type: string; count: number }[];
    peopleContacted: string[];
    engagementLevel: string;
    narrative: string;
  };
};

export type LiaisonAnalyticsCardData = {
  memberId: string;
  memberName: string;
  totalLeads: number;
  newLeads: number;
  totalInteractions: number;
  engagementLevel: "Low" | "Medium" | "High";
  facilitiesCovered: string[];
  touchpointsUsed: { type: string; count: number }[];
  peopleContacted: string[];
};

export type MarketLogRow = {
  id: string;
  createdAt: string;
  facility: string;
  touchpoint: string[];
  talkedTo: string;
  reasonForVisit: string;
  notes: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  showAssistanceForm?: boolean;
  formSubmitted?: boolean;
};

export type SupportTicket = {
  title: string;
  subject: string;
  description: string;
  category: TicketCategory;
  imageUrl: string[];
};

export type TicketRow = {
  id: string;
  ticketNumber: string;
  title: string;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: Priority;
  assignedTo: string;
  assignedToUser: UserTable;
  createBy: string;
  createByUser: UserTable;
  createdAt: string;
  updatedAt: string;
};

export type TicketMessage = {
  id: string;
  message: string;
  sender: string;
  createdAt: string;
  senderUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
  SupportTicketAttachment: TicketAttachment[];
};

export type TicketAttachment = {
  id: string;
  imageUrl: string;
  createdAt: string;
};

export type TicketDetail = {
  id: string;
  ticketNumber: string;
  title: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  createBy: string;
  createByUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
  assignedToUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
  SupportTicketMessage: TicketMessage[];
  SupportHistory: {
    createdAt: string;
  }[];
};
