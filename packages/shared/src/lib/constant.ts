export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  LIAISON: "liason",
  ADMISSION_MANAGER: "admission_manager",
  SUPPORT: "support",
  USER: "user",
  SUPER_ADMIN: "super_admin",
} as const;

// Owner and admin share elevated org access; billing and org deletion stay owner-only.
export const isOrgAdmin = (role?: string | null) =>
  role === ROLES.OWNER || role === ROLES.ADMIN;

// Stored role values are snake_case and liason is misspelled, so labels are mapped.
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.OWNER]: "Owner",
  [ROLES.ADMIN]: "Admin",
  [ROLES.LIAISON]: "Liaison",
  [ROLES.ADMISSION_MANAGER]: "Admission Manager",
};

export const KNOWLEDGE_BASE_ITEMS = [
  {
    iconKey: "play" as const,
    iconBg: "bg-red-500",
    titleColor: "text-red-600",
    title: "Getting started",
    description:
      "Everything you need to know to get started with Refidly.",
  },
  {
    iconKey: "messageCircle" as const,
    iconBg: "bg-amber-500",
    titleColor: "text-amber-600",
    title: "Conversations",
    description:
      "Master RFID systems, readers, and software through Refidly documentation and guides.",
  },
  {
    iconKey: "settings" as const,
    iconBg: "bg-teal-500",
    titleColor: "text-teal-600",
    title: "Admin activities",
    description:
      "Manage users, settings, devices, and boost productivity with Refidly analytics.",
  },
  {
    iconKey: "mic2" as const,
    iconBg: "bg-pink-500",
    titleColor: "text-pink-600",
    title: "Audio, call quality, & network",
    description:
      "Maximize call quality with setup guides and troubleshooting tips.",
  },
  {
    iconKey: "brain" as const,
    iconBg: "bg-blue-600",
    titleColor: "text-blue-600",
    title: "Refidly AI features",
    description:
      "Take advantage of AI-assisted support and troubleshooting for Refidly.",
  },
  {
    iconKey: "creditCard" as const,
    iconBg: "bg-amber-500",
    titleColor: "text-amber-600",
    title: "Billing & subscription",
    description:
      "Manage payments, invoices, taxes, and subscriptions with ease.",
  },
  {
    iconKey: "puzzle" as const,
    iconBg: "bg-purple-500",
    titleColor: "text-purple-600",
    title: "Integrations",
    description:
      "Make the most of Refidly integrations with your systems and tools.",
  },
  {
    iconKey: "package" as const,
    iconBg: "bg-blue-500",
    titleColor: "text-blue-600",
    title: "Product updates",
    description: "Stay up to date on new features, improvements, and changes.",
  },
];

export const RESOURCE_LINKS = [
  {
    title: "Refidly Learning",
    description:
      "Courses, videos, and learning paths designed to help you master Refidly",
  },
  {
    title: "Refidly Webinars & Events",
    description:
      "Discover upcoming Refidly webinars and events and watch on-demand sessions",
  },
  {
    title: "Developers",
    description:
      "Use our API references and tutorials to build solutions fitting your needs",
  },
  {
    title: "Integrations",
    description:
      "Extend Refidly with integrations and third-party solutions",
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

// Support portal page – copy & section titles
export const SEARCH_PLACEHOLDER = "Search for articles";
export const KNOWLEDGE_BASE_SECTION_TITLE = "Browse our knowledge base";
export const RESOURCE_LINKS_SECTION_TITLE = "Resource Links";
export const FOOTER_COPYRIGHT = "© Copyright Support";
export const LOGO_ALT_TEXT = "Refidly logo";

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
      className: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    },
    IN_PROGRESS: {
      className: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    RESOLVED: {
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    CLOSED: {
      className: "bg-gray-50 text-gray-600 border-gray-200",
      dot: "bg-gray-400",
    },
  };

export const priorityConfig: Record<string, { className: string }> = {
  HIGH: { className: "bg-red-50 text-red-700 border-red-200" },
  MEDIUM: { className: "bg-amber-50 text-amber-700 border-amber-200" },
  LOW: { className: "bg-slate-50 text-slate-600 border-slate-200" },
};
