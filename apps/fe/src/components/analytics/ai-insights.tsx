import { Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";

type AIInsights = {
  title: string;
  items: string[];
};
type Props = {
  insights: AIInsights[];
};

const getIconForTitle = (title: string) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("trend")) return TrendingUp;
  if (lowerTitle.includes("people") || lowerTitle.includes("contact"))
    return Users;
  if (lowerTitle.includes("recommendation") || lowerTitle.includes("action"))
    return Target;
  return Zap;
};

export function AIInsights({ insights }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-blue-100/50 to-white p-8 shadow-sm border-2 border-blue-200">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-blue-300/20 rounded-full blur-3xl -z-0" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-100/20 to-blue-200/20 rounded-full blur-3xl -z-0" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-900">
              AI-Powered Insights
            </h2>
            <p className="text-sm text-gray-600">
              Real-time analytics and recommendations
            </p>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map(({ title, items }) => {
            const Icon = getIconForTitle(title);
            return (
              <div
                key={title}
                className="group relative bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border-2 border-gray-300 hover:border-blue-400 hover:-translate-y-0.5"
              >
                {/* Icon & Title */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg flex-1">
                    {title}
                  </h3>
                </div>

                {/* Items */}
                <ul className="space-y-2">
                  {items.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Hover gradient effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/5 transition-all duration-300 pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
