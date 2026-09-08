// Three sizes of the same demo. Only volume and the history window change, so
// a walkthrough rehearsed on one profile reads the same on another.
export type DemoProfile = {
  key: string;
  facilityPrefixes: number;
  facilitySuffixes: number;
  companies: number;
  contactsPerCompany: number;
  referrals: number;
  visits: number;
  // Logged activities beyond the ones mirrored from visits.
  activities: number;
  // Open follow-ups; a third land overdue.
  followUps: number;
  expenses: number;
  mileage: number;
  tasksPerList: number;
  windowDays: number;
};

// facilityPrefixes caps at FACILITY_PREFIX.length and facilitySuffixes at
// FACILITY_SUFFIX.length, so 20 x 6 is the most facilities the catalog can
// name without a collision on the unique record-name index.
const PROFILES: Record<string, DemoProfile> = {
  starter: {
    key: "starter",
    facilityPrefixes: 6,
    facilitySuffixes: 2,
    companies: 4,
    contactsPerCompany: 3,
    referrals: 60,
    visits: 40,
    activities: 50,
    followUps: 12,
    expenses: 18,
    mileage: 20,
    tasksPerList: 5,
    windowDays: 180,
  },
  growth: {
    key: "growth",
    facilityPrefixes: 20,
    facilitySuffixes: 2,
    companies: 12,
    contactsPerCompany: 3,
    referrals: 320,
    visits: 180,
    activities: 220,
    followUps: 40,
    expenses: 60,
    mileage: 70,
    tasksPerList: 12,
    windowDays: 330,
  },
  enterprise: {
    key: "enterprise",
    facilityPrefixes: 20,
    facilitySuffixes: 6,
    companies: 12,
    contactsPerCompany: 6,
    referrals: 1200,
    visits: 520,
    activities: 700,
    followUps: 120,
    expenses: 200,
    mileage: 240,
    tasksPerList: 25,
    windowDays: 540,
  },
};

export const PROFILE_KEYS = Object.keys(PROFILES);

export const DEFAULT_PROFILE = "growth";

export function resolveProfile(key: string = DEFAULT_PROFILE): DemoProfile {
  const profile = PROFILES[key];

  if (!profile) {
    throw new Error(
      `Unknown profile "${key}". Use one of: ${PROFILE_KEYS.join(", ")}`
    );
  }

  return profile;
}
