import {
  formatCapitalize,
  getStatusLabel,
  priorityConfig,
  statusConfig,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.OPEN;
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {getStatusLabel(status)}
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
