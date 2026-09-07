import type { TouchpointType } from "@prisma/client";

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
