import type { TouchpointType } from "@prisma/client";

export const FACILITY_PREFIX = [
  "Cedar Ridge",
  "Lakeview",
  "Northgate",
  "Silver Creek",
  "Harbor Point",
  "Willow Bend",
  "Stonebridge",
  "Fairhaven",
  "Brookside",
  "Summit View",
  "Ashford",
  "Granite Hill",
  "Meadowlark",
  "Riverstone",
  "Copper Basin",
  "Elmwood",
  "Quailridge",
  "Sandpiper",
  "Thornwood",
  "Vantage Park",
];

export const FACILITY_SUFFIX = [
  "Nursing & Rehabilitation",
  "Health Center",
  "Senior Living",
  "Care Community",
  "Post-Acute Care",
  "Skilled Nursing",
];

export const COUNTIES = [
  "Sangamon",
  "Macon",
  "Champaign",
  "Peoria",
  "Winnebago",
  "McLean",
  "Tazewell",
  "Adams",
];

export const CITIES = [
  "Springfield",
  "Decatur",
  "Champaign",
  "Peoria",
  "Rockford",
  "Bloomington",
  "Pekin",
  "Quincy",
];

export const FACILITY_TYPES = [
  "Skilled Nursing",
  "Assisted Living",
  "Memory Care",
  "Rehabilitation",
];

export const CLINICIANS = [
  "Dr. Amara Osei",
  "Dr. Peter Lindqvist",
  "Dr. Ruth Calderon",
  "Nadia Haddad, NP",
  "Marcus Villanueva, RN",
  "Dr. Ingrid Sollberger",
  "Teodora Iliescu, LCSW",
  "Dr. Kwame Boateng",
];

export const PATIENT_NAMES = [
  "R. Whitfield",
  "M. Castellanos",
  "D. Aberdeen",
  "S. Novakova",
  "T. Oyelaran",
  "K. Marchetti",
  "J. Halvorsen",
  "P. Nakashima",
  "L. Fitzgerald",
  "B. Achterberg",
];

export const PAYORS = [
  "Medicare",
  "Medicaid",
  "Private Insurance",
  "Self-Pay",
];

export const ASSESSMENT_TYPES = ["Involuntary", "Voluntary", "Unknown"];

// Matches the Status options onboarding writes for the LEAD module.
export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Won",
  "Lost",
];

export const DENIAL_REASONS = [
  "Bed unavailable at intake",
  "Insurance authorization denied",
  "Behavioral needs exceeded staffing",
  "Family chose another provider",
  "Clinically inappropriate for level of care",
];

// Values from the TouchpointType enum, not invented ones: a bad member would
// fail the insert, and the touchpoint chart reads these verbatim.
export const TOUCHPOINTS: TouchpointType[] = [
  "IN_PERSON_MEETING",
  "PHONE",
  "EMAIL",
  "TEXT",
  "LINKED_IN",
];

export const VISIT_REASONS = [
  "Quarterly relationship check-in",
  "Introduced new admissions criteria",
  "Followed up on a pending referral",
  "Dropped off updated capability sheet",
  "Met the new director of nursing",
];

// ── Companies and contacts ──────────────────────────────────

export const COMPANY_NAMES = [
  "Prairie State Health Group",
  "Midwest Post-Acute Partners",
  "Heartland Senior Services",
  "Verdant Care Holdings",
  "Illinois Valley Health Network",
  "Bluestem Managed Care",
  "Cardinal Ridge Physicians",
  "Wabash Behavioral Group",
  "Kaskaskia Insurance Services",
  "Lincoln Trail Medical Partners",
  "Sangamon Family Practice",
  "Rock River Rehab Alliance",
];

// Only the values onboarding seeds as Industry options are usable here.
export const INDUSTRIES = ["Healthcare", "Insurance", "Other"];

// Matches the Status options onboarding writes for the COMPANY module.
export const COMPANY_STATUSES = ["Prospect", "Active", "Inactive"];

// Matches the Lifecycle Stage options onboarding writes for CONTACT.
export const CONTACT_STAGES = ["New", "Active", "Inactive"];

export const CONTACT_FIRST = [
  "Amara",
  "Peter",
  "Ruth",
  "Nadia",
  "Marcus",
  "Ingrid",
  "Teodora",
  "Kwame",
  "Lena",
  "Desmond",
  "Priya",
  "Hollis",
  "Mireille",
  "Anselm",
  "Yara",
  "Bertrand",
];

export const CONTACT_LAST = [
  "Osei",
  "Lindqvist",
  "Calderon",
  "Haddad",
  "Villanueva",
  "Sollberger",
  "Iliescu",
  "Boateng",
  "Marchetti",
  "Nakashima",
  "Achterberg",
  "Fitzgerald",
];

export const CONTACT_TITLES = [
  "Medical Director",
  "Director of Nursing",
  "Admissions Coordinator",
  "Case Manager",
  "Discharge Planner",
  "Social Worker",
  "Administrator",
  "Regional Liaison",
];

export const CONTACT_NOTES = [
  "Prefers a call before ten in the morning",
  "Handles all weekend intake decisions",
  "Wants the capability sheet emailed ahead of a visit",
  "New in post, introduced last quarter",
  "Signs off on behavioral placements",
];

// The three CONTACT_LINK fields onboarding puts on the LEAD module.
export const FACILITY_CONTACT_FIELDS = [
  "Medical Director",
  "Director of Nursing",
  "Admissions/Marketing",
];

// ── Tasks ───────────────────────────────────────────────────

export const TASK_LISTS = ["Outreach", "Admissions Follow-up", "Reporting"];

export const TASK_NAMES = [
  "Confirm bed availability for the week",
  "Send updated capability sheet",
  "Schedule quarterly check-in visit",
  "Chase pending insurance authorization",
  "Draft the monthly referral summary",
  "Review denials from last month",
  "Update the facility contact list",
  "Prepare marketing packet for the region",
  "Call back the discharge planner",
  "Reconcile mileage for the pay period",
  "Collect missing receipts",
  "Introduce the new liaison to the account",
];

export const TASK_DESCRIPTIONS = [
  "Blocked on a callback from the facility.",
  "Routine, repeats every month.",
  "Raised during the last relationship visit.",
  "Needed before the next reporting cycle.",
];

// ── Expenses and mileage ────────────────────────────────────

export const EXPENSE_DESCRIPTIONS = [
  "Lunch with the admissions team",
  "Printed marketing packets",
  "Parking at the regional hospital",
  "Coffee drop-off for the nursing floor",
  "Conference registration",
  "Fuel for the territory route",
  "Branded folders and pens",
];

export const EXPENSE_NOTES = [
  "Reimbursable under the marketing budget",
  "Approved by the account manager",
  "Split across two facilities on the same route",
  "Receipt to follow",
];

export const MILEAGE_DESTINATIONS = [
  "Springfield territory route",
  "Decatur hospital circuit",
  "Peoria discharge planner visits",
  "Rockford quarterly check-ins",
  "Bloomington intake meetings",
];
