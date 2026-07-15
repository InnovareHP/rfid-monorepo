import type { TaskActivityDto } from "@dashboard/shared";
import { formatDateTime } from "@dashboard/shared";
import { Loader2 } from "lucide-react";

type ActivityTabProps = {
  activities: TaskActivityDto[];
  isLoading?: boolean;
};

const describeActivity = (activity: TaskActivityDto) => {
  const base = `${activity.action} ${activity.field}`;
  if (activity.oldValue && activity.newValue) {
    return `${base}: ${activity.oldValue} → ${activity.newValue}`;
  }
  if (activity.newValue) {
    return `${base}: ${activity.newValue}`;
  }
  if (activity.oldValue) {
    return `${base}: ${activity.oldValue}`;
  }
  return base;
};

export const ActivityTab = ({ activities, isLoading }: ActivityTabProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 py-1.5 text-sm"
        >
          <span className="h-2 w-2 rounded-full bg-primary/60 mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-gray-800">
              <span className="font-medium">
                {activity.actorName ?? "Someone"}
              </span>{" "}
              {describeActivity(activity)}
            </p>
            <p className="text-xs text-gray-400">
              {formatDateTime(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
