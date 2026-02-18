import { STATUS_LABELS } from "./constant";

export const normalizeOptionValue = (value: string) => {
  return value
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(.+?)\1+/g, "$1") // collapse repeated sequences
    .trim();
};

export const normalizeKey = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export const formatElapsedTime = (elapsedMs: number) => {
  const minutes = Math.floor(elapsedMs / (1000 * 60));
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  if (days >= 1) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours >= 1) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
};

export const normalizeFieldName = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function formatCapitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const isValidHeader = (header: string) => {
  if (!header) return false;

  if (/^_+\d+$/.test(header)) return false;

  if (header.includes("�")) return false;

  if (!/[a-zA-Z0-9]/.test(header)) return false;

  return true;
};

export const normalizeHeader = (header: string) =>
  header
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const mapAIAnalysisToInsights = (analysis: {
  keyInsights: string[];
  strengths: string[];
  weaknesses: string[];
  actionableRecommendations: string[];
  engagementOptimizations: string[];
}) => {
  return [
    {
      title: "Key Insights",
      items: analysis.keyInsights,
    },
    {
      title: "Strengths",
      items: analysis.strengths,
    },
    {
      title: "Weaknesses",
      items: analysis.weaknesses,
    },
    {
      title: "Actionable Recommendations",
      items: analysis.actionableRecommendations,
    },
    {
      title: "Engagement Optimizations",
      items: analysis.engagementOptimizations,
    },
  ];
};

export const getStatusLabel = (status: string): string => {
  return STATUS_LABELS[status] ?? status;
};

export const getStatusBadgeVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "OPEN" || status === "IN_PROGRESS") return "default";
  return "secondary";
};

export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60)
    return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  if (diffHour < 24)
    return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
  if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;

  return date.toLocaleDateString();
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
