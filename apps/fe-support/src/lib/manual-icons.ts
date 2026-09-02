import {
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  CreditCard,
  FileText,
  Mail,
  Package,
  Play,
  Puzzle,
  Settings,
  Share2,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

// Editors type a lucide name by hand, so this is an allowlist rather than a
// dynamic lookup: importing the whole icon set to resolve one name would ship
// it to every visitor.
const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  CreditCard,
  FileText,
  Mail,
  Package,
  Play,
  Puzzle,
  Settings,
  Share2,
  Shield,
  Users,
};

export const manualIcon = (name: string | null | undefined): LucideIcon =>
  ICONS[name?.trim() ?? ""] ?? BookOpen;
