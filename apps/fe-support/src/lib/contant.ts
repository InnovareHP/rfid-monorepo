import {
  Brain,
  CreditCard,
  MessageCircle,
  Mic2,
  Package,
  Play,
  Puzzle,
  Settings,
} from "lucide-react";

export const KNOWLEDGE_BASE_ICON_MAP = {
  play: Play,
  messageCircle: MessageCircle,
  settings: Settings,
  mic2: Mic2,
  brain: Brain,
  creditCard: CreditCard,
  puzzle: Puzzle,
  package: Package,
} as const;

export const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL;

// Keep this in sync (at least for roles you care about)
// with the shared ROLES in @dashboard/shared.
export const ROLES = {
  SUPPORT: "support",
  USER: "user",
  SUPER_ADMIN: "super_admin",
} as const;

export type CannedResponse = {
  id: string;
  label: string;
  text: string;
};

export const CANNED_RESPONSES: CannedResponse[] = [
  {
    id: "received",
    label: "Received — will respond soon",
    text: "Thank you for contacting us! We've received your request and our team will respond within 24 hours.",
  },
  {
    id: "investigating",
    label: "Investigating your issue",
    text: "We're currently looking into your issue and will keep you updated on our progress. Thank you for your patience.",
  },
  {
    id: "need-info",
    label: "Need more information",
    text: "Could you please provide more details about the issue? Any screenshots or additional context would be very helpful so we can assist you faster.",
  },
  {
    id: "resolved",
    label: "Issue resolved",
    text: "Your issue has been resolved. Please don't hesitate to reach out if you have any further questions — we're happy to help!",
  },
  {
    id: "apologize",
    label: "Apologize for inconvenience",
    text: "We sincerely apologize for the inconvenience. Our team is working to resolve this as quickly as possible and we appreciate your patience.",
  },
  {
    id: "escalated",
    label: "Escalated to team",
    text: "We've escalated your case to our specialist team for further review. You can expect an update within 1–2 business days.",
  },
  {
    id: "follow-up",
    label: "Following up",
    text: "We're following up on your support request. Could you let us know if the issue has been resolved or if you're still experiencing problems?",
  },
];
