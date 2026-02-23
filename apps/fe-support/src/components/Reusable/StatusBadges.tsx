import {
  formatCapitalize,
  getStatusLabel,
  priorityConfig,
  ROLES,
  statusConfig,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";

export function StatusBadge({
  status,
  banned,
}: {
  status?: string;
  banned?: boolean;
}) {
  const config = statusConfig[status ?? "OPEN"] ?? statusConfig.OPEN;
  const label = banned ? "Banned" : getStatusLabel(status ?? "OPEN");
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] ?? priorityConfig.LOW;
  return (
    <Badge variant="outline" className={config.className}>
      {formatCapitalize(priority.toLowerCase())}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const variant =
    role === ROLES.SUPER_ADMIN
      ? "default"
      : role === ROLES.SUPPORT
        ? "secondary"
        : "outline";
  // Use 'as keyof typeof ROLE_LABELS' to fix the indexing error.
  return (
    <Badge variant={variant}>{ROLES[role as keyof typeof ROLES] ?? role}</Badge>
  );
}
