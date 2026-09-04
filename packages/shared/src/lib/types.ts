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
  totalReferrals: number;
  admissions: number;
  ownFacilityReferrals: number;
  otherFacilityReferrals: number;
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

export type SessionMember = {
  id: string;
  role: string;
  organizationId: string;
};

export type SessionContext = {
  member: SessionMember | null;
  organization: Organization | null;
  subscription: Subscription | null;
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

export type BoardStatMetric = {
  value: number;
  previous: number;
};

export type BoardStats = {
  totalFacilities: BoardStatMetric;
  activePartners: BoardStatMetric;
  countiesCovered: BoardStatMetric;
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
  createdAt: string;
  createdBy: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
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
  recordId: string;
  createdAt: string;
  createdBy: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  column?: string;
  fieldId?: string;
  message?: string;
};

export type LeadHistoryItem = {
  id: string;
  recordId: string;
  createdAt: string;
  createdBy: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  column?: string;
  fieldId?: string;
  message?: string;
};

export type AnalyticsResponse = {
  totalCounts: TotalCounts;
  statusBreakdown: StatusBreakdownItem[];
  avgTimeByStatus: AvgTimeByStatus[];
  avgTimeTrend?: MonthlyTotal[]; // weighted avg days per month
  assessmentTypes: AssessmentTypeAnalytics[];
  clinicians: ClinicianAnalytics[];
  conversion: ConversionAnalytics;
  counties: CountyAnalytics[];
  discharge: DischargeAnalytics[];
  facilities: FacilityAnalytics[];
  outreach: OutreachAnalytics[];
  payers: PayerAnalytics[];
  sources: SourceAnalytics[];
  scorecard: ReferralSourceScore[];
  denials: DenialAnalytics;
  analytics: string;
};

export type TotalCounts = {
  totalReferrals: number;
  totalLeads: number;
  referralsThisPeriod: number;
  leadsThisPeriod: number;
};

export type StatusBreakdownItem = {
  status: string;
  count: number;
  color: string | null;
};

export type AvgTimeByStatus = {
  status: string;
  averageDays: string;
  count: number;
};

export type AssessmentTypeAnalytics = {
  value: string | null;
  _count: { value: number };
};

export type MonthlyTotal = {
  month: string; // e.g. "2025-11"
  total: number;
};

export type ConversionAnalytics = {
  totalReferrals: number;
  admitted: number;
  conversionRate: number; // percentage
  monthlyAdmitted?: MonthlyTotal[];
  monthlyRate?: MonthlyTotal[]; // conversion rate per month, percentage
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

export type ReferralSourceScore = {
  sourceName: string;
  referralCount: number;
  tier: "Tier 1" | "Tier 2" | "Infrequent";
  referralsPerWeek: number;
};

export type DenialReasonAnalytics = {
  reason: string;
  count: number;
};

export type DenialTrendAnalytics = {
  month: string;
  total: number;
};

export type DenialAnalytics = {
  reasons: DenialReasonAnalytics[];
  monthlyTrend: DenialTrendAnalytics[];
  totalDenials: number;
};

export type OptionsResponse = {
  id: string;
  value: string;
};

export type Subscription = {
  cancelAtPeriodEnd: boolean;
  id: string;
  // Null outside a trial, and the only date the trial banner counts down from.
  trialEnd: string | null;
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

export type ReferralSourceTier = "Tier 1" | "Tier 2" | "Infrequent";

export type RecordReferralStats = {
  count: number;
  firstReferralAt: string | null;
  lastReferralAt: string | null;
  perWeek: number;
  tier: ReferralSourceTier;
};

export type LeadAnalyze = {
  recordId: string;
  assignedTo: string | null;
  recordName: string;
  summary: {
    totalInteractions: number;
    facilitiesCovered: string[];
    touchpointsUsed: { type: string; count: number }[];
    peopleContacted: string[];
    engagementLevel: string;
    narrative: string;
    referrals: RecordReferralStats;
  };
};

export type LiaisonAnalyticsCardData = {
  memberId: string;
  memberName: string;
  totalLeads: number;
  newLeads: number;
  totalReferrals: number;
  admissions: number;
  // Of their referrals, how many came from a facility they are the account
  // manager for. The remainder of totalReferrals had no facility, or one
  // nobody manages.
  ownFacilityReferrals: number;
  otherFacilityReferrals: number;
  totalInteractions: number;
  engagementLevel: "Low" | "Medium" | "High";
  facilitiesCovered: string[];
  touchpointsUsed: { type: string; count: number }[];
  peopleContacted: string[];
};

export type MarketingAiAnalysis = {
  keyInsights: string[];
  strengths: string[];
  weaknesses: string[];
  actionableRecommendations: string[];
  engagementOptimizations: string[];
};

export type MarketingAnalyticsResponse = {
  analytics: LiaisonAnalyticsCardData[];
  analysis: MarketingAiAnalysis | null;
  totals: { referrals: number; admissions: number };
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

export type MarketingReportRow = {
  id: string;
  facility: string;
  facilityRecordId: string | null;
  touchpoints: string[];
  talkedTo: string;
  reasonForVisit: string | null;
  notes: string | null;
  // Null once the liaison has been removed from the organization; liaisonName
  // still reads, because the log also carries the user id.
  memberId: string | null;
  userId: string | null;
  organizationId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string | null;
  liaisonName: string;
};

export type MarketingFacilityBreakdown = {
  facility: string;
  facilityRecordId: string | null;
  outreach: number;
  referrals: number;
  admissions: number;
  conversionRate: number;
};

export type MarketingTouchpointBreakdown = {
  touchpoint: string;
  count: number;
};

export type MarketingReportResponse = {
  data: MarketingReportRow[];
  total: number;
  totals: {
    outreach: number;
    referrals: number;
    admissions: number;
    conversionRate: number;
    admissionRate: number;
  };
  facilityBreakdown: MarketingFacilityBreakdown[];
  touchpointBreakdown: MarketingTouchpointBreakdown[];
  nextPage: number | null;
};

// Destinations the assistant may link to, keyed so the model never supplies a path.
export const ASSISTANT_DESTINATIONS = {
  home: "",
  my_requests: "/request",
  account: "/account",
} as const;

export type AssistantDestination = keyof typeof ASSISTANT_DESTINATIONS;

export type AssistantFormPrefill = {
  title?: string;
  subject?: string;
  description?: string;
  category?: TicketCategory;
};

export type AssistantAction =
  | { kind: "open_form"; label: string; prefill: AssistantFormPrefill }
  | { kind: "navigate"; label: string; destination: AssistantDestination };

export type AssistantStreamEvent =
  | { type: "token"; text: string }
  | { type: "step"; tool: string }
  // The text so far was preamble to a tool call, not the answer.
  | { type: "reset" }
  | {
      type: "done";
      answered: boolean;
      answer: string | null;
      actions: AssistantAction[];
    }
  | { type: "error" };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  showAssistanceForm?: boolean;
  formSubmitted?: boolean;
  pending?: boolean;
  // Tool name behind the current step; the label for it lives in AI_STEP_LABELS.
  step?: string;
  actions?: AssistantAction[];
  prefill?: AssistantFormPrefill;
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
  assignedTo: string | null;
  assignedToUser: UserTable | null;
  createBy: string;
  createByUser: UserTable;
  createdAt: string;
  updatedAt: string;
  hasAgentReply: boolean;
};

export type TicketWorkloadRow = {
  userId: string;
  name: string;
  image: string | null;
  activeCount: number;
};

export type TicketStats = {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
  createdToday: number;
  solvedToday: number;
  // Past the first-reply SLA with no agent reply yet.
  overdue: number;
  // Answered but still unresolved past the resolution SLA.
  atRisk: number;
  workload: TicketWorkloadRow[];
  avgCsat: number | null;
  totalRatings: number;
  avgFirstReplyHours: number | null;
  avgResolutionHours: number | null;
};

export type TicketRatingRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  supportTicketId: string;
  supportTicket: {
    ticketNumber: string;
    title: string;
    subject: string;
  };
  createdByUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
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

export type HistoryChangeType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "MESSAGE_SENT"
  | "PRIORITY_CHANGED"
  | "CLOSED"
  | "REOPENED"
  | "RATED";

export type TicketHistoryEntry = {
  id: string;
  createdAt: string;
  message: string;
  changeType: HistoryChangeType;
  sender: string;
  senderUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
};

export type TicketRating = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

export type SupportAgent = {
  id: string;
  user_name: string;
  user_image: string;
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
  assignedTo: string | null;
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
  } | null;
  SupportTicketMessage: TicketMessage[];
  SupportHistory: TicketHistoryEntry[];
  SupportTicketRating: TicketRating | null;
};

export type OnboardingStreamEvent =
  | { type: "progress"; step: string; label: string }
  | { type: "done"; organizationId: string }
  | { type: "error"; message: string };

export type AdminUserCreateStreamEvent =
  | { type: "progress"; step: string; label: string }
  | { type: "done"; userId: string; organizationId: string }
  | { type: "error"; message: string };

export type MasterListBreakdownItem = {
  value: string | null;
  _count: {
    value: number;
  };
};

export type MasterListAnalyticsResponse = {
  totals: {
    totalFacilities: number;
    facilitiesThisPeriod: number;
    referringFacilities: number;
    dormantFacilities: number;
    coverageRate: number;
  };
  statusBreakdown: StatusBreakdownItem[];
  facilityTypes: MasterListBreakdownItem[];
  counties: MasterListBreakdownItem[];
  growthTrend: MonthlyTotal[];
  byLiaison: MasterListBreakdownItem[];
  topReferringFacilities: MasterListBreakdownItem[];
  dormant: { name: string; county: string | null }[];
};
