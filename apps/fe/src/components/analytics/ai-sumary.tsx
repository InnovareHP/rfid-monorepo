import { Card, CardContent, CardHeader, CardTitle } from "@dashboard/ui/components/card";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

function useTypewriter(text: string, speed = 12) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!text) return setDisplayed("");

    let i = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text]);

  return displayed;
}

function trimObject(obj: any, maxKeys = 5) {
  if (typeof obj !== "object" || obj === null) return obj;
  const keys = Object.keys(obj);
  if (keys.length <= maxKeys) return obj;
  const trimmed: any = {};
  keys.slice(0, maxKeys).forEach((key) => (trimmed[key] = obj[key]));
  return trimmed;
}

function renderAIContent(content: any): React.ReactNode {
  const formatKey = (key: string) =>
    key
      .replace(/_/g, " ") // replace underscores
      .replace(
        /\w\S*/g,
        (
          w // capitalize every word
        ) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );

  if (typeof content === "string") {
    return <p className="text-sm text-gray-700 leading-relaxed">{content}</p>;
  }

  if (Array.isArray(content)) {
    return (
      <ul className="list-disc ml-5 text-sm text-gray-700 space-y-2">
        {content.map((item, i) => (
          <li key={i} className="leading-relaxed">{renderAIContent(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof content === "object" && content !== null) {
    return (
      <div className="ml-2 space-y-4">
        {Object.entries(content).map(([key, value]) => (
          <div key={key} className="bg-white/50 rounded-lg p-3 border border-blue-100">
            <h4 className="font-bold text-sm text-blue-900 mb-2">{formatKey(key)}</h4>
            <div className="ml-2">{renderAIContent(value)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-gray-700">{String(content)}</p>;
}

export default function AiSummary({
  isLoadingSummary,
  summary,
}: {
  isLoadingSummary: boolean;
  summary: any;
}) {
  const [expanded, setExpanded] = useState(false);

  const summaryStr = summary ? JSON.stringify(summary) : "";
  const isLong = summaryStr.length > 600;

  const shownSummary = expanded ? summary : trimObject(summary, 5);
  const typewriterRaw = JSON.stringify(shownSummary);

  const typed = useTypewriter(typewriterRaw);

  let parsed: any = shownSummary;
  try {
    parsed = JSON.parse(typed);
  } catch {
    // partial JSON while typing
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="border-b bg-gradient-to-r from-blue-100 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            AI-Powered Insights
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Loading */}
        {isLoadingSummary && !summary && (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-blue-700 font-medium">
              Analyzing your analytics data and generating insights...
            </p>
          </div>
        )}

        {/* Render object */}
        {!isLoadingSummary && summary && (
          <div className="space-y-4">
            {renderAIContent(parsed)}

            {/* Show more toggle */}
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors mt-4 group"
              >
                {expanded ? (
                  <>
                    Show less <ChevronUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
