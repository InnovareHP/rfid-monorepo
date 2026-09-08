import type { ActivityType } from "@prisma/client";

// Types a liaison raises by hand. EMAIL_BLAST has no member on the enum and a
// blast is never logged here, so the marketing feature stays the only source
// of those.
export const LOGGED_ACTIVITY_TYPES: ActivityType[] = [
  "CALL",
  "EMAIL",
  "MEETING",
  "NOTE",
  "FAX",
  "TEXT",
];

export const CALL_TITLES = [
  "Called the admissions desk",
  "Left a voicemail for the discharge planner",
  "Checked bed availability by phone",
  "Returned a call about a pending referral",
  "Confirmed the intake paperwork by phone",
];

export const MEETING_TITLES = [
  "On-site visit with the nursing team",
  "Quarterly review with the administrator",
  "Introduced the new admissions criteria",
  "Sat in on the discharge planning huddle",
  "Toured the new rehab wing",
];

export const NOTE_TITLES = [
  "Census is up, watch for overflow referrals",
  "New director of nursing starts next month",
  "Prefers referrals faxed, not emailed",
  "Two beds held for our patients through the weekend",
  "Contract renewal comes up in the spring",
];

export const TEXT_TITLES = [
  "Texted the intake coordinator",
  "Sent a quick availability check by text",
  "Texted to confirm the visit window",
];

export const FAX_TITLES = [
  "Faxed the referral packet",
  "Faxed updated insurance authorization",
  "Faxed the signed intake form",
];

export const EMAIL_SUBJECTS = [
  "Referral packet for your review",
  "Updated admissions criteria",
  "Following up on last week's visit",
  "Bed availability this week",
  "Quarterly capability sheet",
];

export const EMAIL_BODIES = [
  "Attaching the packet we discussed. Happy to walk through any of it.",
  "Sharing our updated criteria so your planners have the current version.",
  "Thanks for the time on site. Sending the summary I promised.",
  "We have openings this week if you have anyone pending placement.",
  "Here is the current capability sheet for your reference binder.",
];

// Follow-ups are the open queue, so their titles read as work not yet done.
export const FOLLOW_UP_TITLES = [
  "Call back about the pending referral",
  "Send the updated capability sheet",
  "Confirm the quarterly visit date",
  "Check whether the authorization cleared",
  "Follow up on the bed hold request",
  "Drop off printed packets",
  "Introduce the new account manager",
  "Re-send the intake form",
];

export const FOLLOW_UP_NOTES = [
  "They asked to be contacted after the census meeting.",
  "Second attempt; first call went to voicemail.",
  "Waiting on their side before we can proceed.",
  "Promised during the last on-site visit.",
  "Time-sensitive, tied to a discharge this week.",
];

export const CANCELLED_NOTES = [
  "Contact left the facility before we could follow up.",
  "Handled in person during an unrelated visit instead.",
  "Referral was placed elsewhere, no longer needed.",
];

export const CONTACT_ACTIVITY_TITLES = [
  "Intro call with the new coordinator",
  "Sent the onboarding overview",
  "Confirmed their preferred referral channel",
  "Asked about their discharge volume",
];

export const OPEN_CLIENT_TYPES = ["desktop", "mobile", "webmail"];
