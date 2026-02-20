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
