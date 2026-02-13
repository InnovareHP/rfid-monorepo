export const ROLES = {
  OWNER: "owner",
  LIASON: "liason",
  ADMISSION_MANAGER: "admission_manager",
};

export const KNOWLEDGE_BASE_ITEMS = [
  {
    iconKey: "play" as const,
    iconBg: "bg-red-500",
    titleColor: "text-red-600",
    title: "Getting started",
    description:
      "Everything you need to know to get started with Innovare HP RFID.",
  },
  {
    iconKey: "messageCircle" as const,
    iconBg: "bg-amber-500",
    titleColor: "text-amber-600",
    title: "Conversations",
    description:
      "Master RFID systems, readers, and software through Innovare HP RFID documentation and guides.",
  },
  {
    iconKey: "settings" as const,
    iconBg: "bg-teal-500",
    titleColor: "text-teal-600",
    title: "Admin activities",
    description:
      "Manage users, settings, devices, and boost productivity with Innovare HP RFID analytics.",
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
    title: "Innovare HP RFID AI features",
    description:
      "Take advantage of AI-assisted support and troubleshooting for Innovare HP RFID.",
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
      "Make the most of Innovare HP RFID integrations with your systems and tools.",
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
    title: "Innovare HP RFID Learning",
    description:
      "Courses, videos, and learning paths designed to help you master Innovare HP RFID",
  },
  {
    title: "Innovare HP RFID Webinars & Events",
    description:
      "Discover upcoming Innovare HP RFID webinars and events and watch on-demand sessions",
  },
  {
    title: "Developers",
    description:
      "Use our API references and tutorials to build solutions fitting your needs",
  },
  {
    title: "Integrations",
    description:
      "Extend Innovare HP RFID with integrations and third-party solutions",
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
  "Hello! I'm your AI assistant. I know a lot about Innovare HP RFID and I can do much more than chatbots you've seen before. How can I help? Tell me as much as you can about your question.";

// Support portal page – copy & section titles
export const SEARCH_PLACEHOLDER = "Search for articles";
export const KNOWLEDGE_BASE_SECTION_TITLE = "Browse our knowledge base";
export const RESOURCE_LINKS_SECTION_TITLE = "Resource Links";
export const FOOTER_COPYRIGHT = "© Copyright Support";
export const LOGO_ALT_TEXT = "Dashboard logo";

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
