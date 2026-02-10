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
