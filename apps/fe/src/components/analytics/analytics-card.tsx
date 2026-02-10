import { Badge } from "@dashboard/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@dashboard/ui/components/card";
import type { LiaisonAnalyticsCardData } from "@/lib/types";
import {
  Activity,
  Award,
  Building2,
  Calendar,
  Flame,
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

type Props = {
  data: LiaisonAnalyticsCardData;
};

const getTouchpointIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("email")) return Mail;
  if (lowerType.includes("call") || lowerType.includes("phone")) return Phone;
  if (lowerType.includes("meeting") || lowerType.includes("visit"))
    return Video;
  if (lowerType.includes("message") || lowerType.includes("text"))
    return MessageSquare;
  if (lowerType.includes("event")) return Calendar;
  return Activity;
};

export function LiaisonAnalyticsCard({ data }: Props) {
  const engagementConfig = {
    Low: {
      gradient: "from-rose-500 to-red-500",
      bgGradient: "from-rose-50 to-red-50",
      icon: Flame,
      color: "text-red-600",
      ringColor: "ring-red-200",
    },
    Medium: {
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
      icon: TrendingUp,
      color: "text-amber-600",
      ringColor: "ring-amber-200",
    },
    High: {
      gradient: "from-emerald-500 to-green-500",
      bgGradient: "from-emerald-50 to-green-50",
      icon: Award,
      color: "text-emerald-600",
      ringColor: "ring-emerald-200",
    },
  };

  const config = engagementConfig[data.engagementLevel];
  const EngagementIcon = config.icon;

  // Calculate progress percentage (example: out of 100 interactions)
  const progressPercentage = Math.min(
    (data.totalInteractions / 100) * 100,
    100
  );

  return (
    <Card className="group h-full hover:shadow-md transition-all duration-300 border-2 border-gray-300 hover:border-blue-400 bg-white overflow-hidden">
      {/* Decorative top gradient bar */}
      <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />

      <CardHeader className="space-y-4 pb-4">
        {/* Header with engagement badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 mb-1">
              {data.memberName === "" ? "Amy Cunningham" : data.memberName}
            </CardTitle>
            <p className="text-xs text-gray-500 font-medium">
              Liaison Performance
            </p>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.bgGradient} border-2 ${config.ringColor.replace('ring-', 'border-')}`}
          >
            <EngagementIcon className={`h-3.5 w-3.5 ${config.color}`} />
            <span className={`text-xs font-semibold ${config.color}`}>
              {data.engagementLevel}
            </span>
          </div>
        </div>

        {/* Interaction Stats - Large & Bold */}
        <div
          className={`relative rounded-xl bg-gradient-to-br ${config.bgGradient} p-5 border-2 ${config.ringColor.replace('ring-', 'border-')}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} shadow-md`}
              >
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {data.totalInteractions}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  Total Interactions
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-500 shadow-sm`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Facilities Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">
              Facilities Covered
            </p>
            <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {data.facilitiesCovered.length}
            </span>
          </div>

          {data.facilitiesCovered.length === 0 ? (
            <p className="text-xs text-gray-500 italic pl-6">
              No facilities logged
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pl-6">
              {data.facilitiesCovered.map((facility) => (
                <Badge
                  key={facility}
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium"
                >
                  {facility}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* People Contacted Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">
              People Contacted
            </p>
            <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {data.peopleContacted.length}
            </span>
          </div>

          {data.peopleContacted.length === 0 ? (
            <p className="text-xs text-gray-500 italic pl-6">
              No contacts logged
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pl-6">
              {data.peopleContacted.map((person) => (
                <Badge
                  key={person}
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium"
                >
                  {person}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Touchpoints Section - Enhanced */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">
              Touchpoints Used
            </p>
          </div>

          {data.touchpointsUsed.length === 0 ? (
            <p className="text-xs text-gray-500 italic pl-6">
              No touchpoints recorded
            </p>
          ) : (
            <div className="space-y-2 pl-6">
              {data.touchpointsUsed.map((tp) => {
                const Icon = getTouchpointIcon(tp.type);
                const percentage = (tp.count / data.totalInteractions) * 100;

                return (
                  <div key={tp.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-gray-700 font-medium capitalize">
                          {tp.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="font-bold text-blue-600">
                        {tp.count}
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {/* Hover effect overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/0 group-hover:from-blue-50/30 group-hover:to-blue-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      />
    </Card>
  );
}
