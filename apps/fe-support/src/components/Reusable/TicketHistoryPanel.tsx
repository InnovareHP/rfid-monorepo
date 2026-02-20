import { getTicketHistory } from "@/services/support/support-service";
import type { HistoryChangeType, TicketHistoryEntry } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleDot,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  UserCheck,
  XCircle,
} from "lucide-react";

const CHANGE_TYPE_CONFIG: Record<
  HistoryChangeType,
  { icon: React.ElementType; label: string; color: string }
> = {
  CREATED: {
    icon: CircleDot,
    label: "Ticket created",
    color: "text-blue-500",
  },
  STATUS_CHANGED: {
    icon: RefreshCw,
    label: "Status changed",
    color: "text-yellow-500",
  },
  ASSIGNED: {
    icon: UserCheck,
    label: "Assigned",
    color: "text-purple-500",
  },
  MESSAGE_SENT: {
    icon: MessageSquare,
    label: "Message sent",
    color: "text-muted-foreground",
  },
  PRIORITY_CHANGED: {
    icon: RefreshCw,
    label: "Priority changed",
    color: "text-orange-500",
  },
  CLOSED: {
    icon: XCircle,
    label: "Closed",
    color: "text-red-500",
  },
  REOPENED: {
    icon: CheckCircle2,
    label: "Reopened",
    color: "text-green-500",
  },
  RATED: {
    icon: Star,
    label: "Rated",
    color: "text-yellow-400",
  },
};

function HistoryEntry({ entry }: { entry: TicketHistoryEntry }) {
  const config = CHANGE_TYPE_CONFIG[entry.changeType] ?? CHANGE_TYPE_CONFIG.MESSAGE_SENT;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${config.color}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={entry.senderUser.user_image} />
            <AvatarFallback className="text-[9px]">
              {entry.senderUser.user_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">
            {entry.senderUser.user_name}
          </span>
          <span className="text-xs text-muted-foreground">
            ·{" "}
            {new Date(entry.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{entry.message}</p>
      </div>
    </div>
  );
}

export function TicketHistoryPanel({ ticketId }: { ticketId: string }) {
  const { data: history = [], isLoading } = useQuery<TicketHistoryEntry[]>({
    queryKey: ["ticket-history", ticketId],
    queryFn: () => getTicketHistory(ticketId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No history yet
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4">
      {history.map((entry, i) => (
        <div
          key={entry.id}
          className={i === history.length - 1 ? "[&>div>div:last-child]:hidden" : ""}
        >
          <HistoryEntry entry={entry} />
        </div>
      ))}
    </div>
  );
}
