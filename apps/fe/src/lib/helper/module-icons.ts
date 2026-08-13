import {
  Building2,
  Contact,
  FileText,
  Table2,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

// Modules store an icon name rather than a component, so the sidebar and the
// setup wizard have to agree on which names resolve.
export const MODULE_ICONS: Record<string, LucideIcon> = {
  FileText,
  Users,
  Contact,
  Building2,
  Truck,
  Table2,
};

export const moduleIcon = (name: string | null) =>
  MODULE_ICONS[name ?? ""] ?? Table2;
