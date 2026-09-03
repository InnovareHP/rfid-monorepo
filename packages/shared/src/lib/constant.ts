export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  LIAISON: "liason",
  MEMBER: "member",
  SUPPORT: "support",
  USER: "user",
  SUPER_ADMIN: "super_admin",
} as const;

// Owner and admin share elevated org access; billing and org deletion stay owner-only.
export const isOrgAdmin = (role?: string | null) =>
  role === ROLES.OWNER || role === ROLES.ADMIN;

// Referral analytics is org-wide for a liaison too; lower roles read only the
// referrals assigned to them.
export const readsOrgWideReferrals = (role?: string | null) =>
  isOrgAdmin(role) || role === ROLES.LIAISON;

// Stored role values are snake_case and liason is misspelled, so labels are mapped.
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.OWNER]: "Owner",
  [ROLES.ADMIN]: "Admin",
  [ROLES.LIAISON]: "Liaison",
  [ROLES.MEMBER]: "Member",
};

// Icon tiles cycle the avatar palette: theme-independent, fixed white foreground.
export const KNOWLEDGE_BASE_ITEMS = [
  {
    iconKey: "play" as const,
    iconBg: "bg-avatar-6",
    title: "Getting started",
    description:
      "Set up your organization, invite your team, and run your first week in Refidly.",
  },
  {
    iconKey: "clipboardList" as const,
    iconBg: "bg-avatar-2",
    title: "Leads & master list",
    description:
      "Build custom fields, edit inline, filter, import from CSV, and restore history.",
  },
  {
    iconKey: "share2" as const,
    iconBg: "bg-avatar-4",
    title: "Referrals",
    description:
      "Track referral sources, assign liaisons, and follow every referral to admission.",
  },
  {
    iconKey: "barChart3" as const,
    iconBg: "bg-avatar-5",
    title: "Analytics & reporting",
    description:
      "Read dashboards, build saved reports, and schedule the monthly report.",
  },
  {
    iconKey: "brain" as const,
    iconBg: "bg-avatar-7",
    title: "Refidly AI features",
    description:
      "Use AI lead analysis, follow-up suggestions, and the support assistant.",
  },
  {
    iconKey: "settings" as const,
    iconBg: "bg-avatar-1",
    title: "Admin & team management",
    description:
      "Manage members, roles, permissions, and organization-wide settings.",
  },
  {
    iconKey: "creditCard" as const,
    iconBg: "bg-avatar-3",
    title: "Billing & subscription",
    description:
      "Manage seats, plans, invoices, and entitlements for your organization.",
  },
  {
    iconKey: "puzzle" as const,
    iconBg: "bg-avatar-8",
    title: "Integrations",
    description:
      "Connect Google and Outlook calendar and mail, and the EldonFax integration.",
  },
  {
    iconKey: "package" as const,
    iconBg: "bg-brand",
    title: "Product updates",
    description: "Stay up to date on new features, improvements, and changes.",
  },
];

export const FOOTER_LINKS = [
  "Feedback",
  "Privacy",
  "Terms of use",
  "Security",
  "DPA",
  "AI Disclaimer",
];

export const AI_WELCOME_MESSAGE =
  "Hello! I'm your AI assistant. I know a lot about Refidly and I can do much more than chatbots you've seen before. How can I help? Tell me as much as you can about your question.";

// Shown when the assistant cannot answer and falls back to a support ticket.
export const AI_ASSISTANCE_FALLBACK_MESSAGE =
  "I can't answer that one yet. Fill out the form below and our support team will get back to you shortly.";

// Shown when the user opens the request form directly.
export const AI_ASSISTANCE_FORM_MESSAGE =
  "Please fill out the form below and we'll get back to you shortly.";

// Shown when the assistant request itself fails.
export const AI_ASSISTANCE_ERROR_MESSAGE =
  "The assistant is unavailable right now. Fill out the form below and our support team will take it from here.";

export const AI_REQUEST_ACTION_LABEL = "Submit a request";

// The runtime emits tool names only; the copy for each one lives here.
export const AI_STEP_LABELS: Record<string, string> = {
  list_my_tickets: "Checking your requests...",
  get_ticket_status: "Looking up that request...",
  propose_contact_form: "Preparing a request form...",
  propose_navigate: "Finding the right page...",
};

export const AI_STEP_FALLBACK_LABEL = "Working on it...";

// Support portal page – copy & section titles
export const SEARCH_PLACEHOLDER = "Search for articles";
export const KNOWLEDGE_BASE_SECTION_TITLE = "Browse our knowledge base";
export const FOOTER_COPYRIGHT = "© Refidly. All rights reserved.";
export const LOGO_ALT_TEXT = "Refidly";

// Header / nav
export const DEFAULT_LANGUAGE_LABEL = "EN";
export const LANGUAGE_OPTIONS = [
  { label: "English" },
  { label: "Español" },
  { label: "Français" },
] as const;
export const CONTACT_US_LABEL = "Contact Us";
export const USER_MENU_LABEL = "User name";
export const ACCOUNT_LABEL = "Account";
export const SIGN_OUT_LABEL = "Sign out";

// SLA thresholds in hours, shared so the ticket badges and the KPI counts agree.
export const SLA_FIRST_REPLY_HOURS = 24;
export const SLA_RESOLUTION_HOURS = 72;

export const TICKET_CATEGORIES = [
  "GENERAL",
  "TECHNICAL",
  "ACCOUNT",
  "OTHER",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN PROGRESS",
  RESOLVED: "SOLVED",
  CLOSED: "CLOSED",
};

export const statusConfig: Record<string, { className: string; dot: string }> =
  {
    OPEN: {
      className: "bg-info/10 text-info border-info/20",
      dot: "bg-info",
    },
    IN_PROGRESS: {
      className: "bg-warning/10 text-warning border-warning/20",
      dot: "bg-warning",
    },
    RESOLVED: {
      className: "bg-success/10 text-success border-success/20",
      dot: "bg-success",
    },
    CLOSED: {
      className: "bg-muted text-muted-foreground border-border",
      dot: "bg-muted-foreground",
    },
  };

export const priorityConfig: Record<string, { className: string }> = {
  HIGH: {
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  MEDIUM: { className: "bg-warning/10 text-warning border-warning/20" },
  LOW: { className: "bg-muted text-muted-foreground border-border" },
};
