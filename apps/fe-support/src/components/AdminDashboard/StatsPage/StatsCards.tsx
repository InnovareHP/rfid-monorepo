import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { cn } from "@dashboard/ui/lib/utils";
import { Link } from "@tanstack/react-router";

type Tone = "default" | "success" | "warning" | "destructive" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  default: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  loading,
  suffix,
}: {
  label: string;
  value: number | string | null;
  icon: React.ElementType;
  tone?: Tone;
  loading: boolean;
  suffix?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-5 pb-2 pt-4">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
          <Icon className={cn("h-4 w-4", TONE_CLASSES[tone])} />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-foreground text-3xl font-bold">
            {typeof value === "number" ? value.toLocaleString() : (value ?? "—")}
            {suffix && value !== null && (
              <span className="text-muted-foreground ml-1 text-lg font-normal">
                {suffix}
              </span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function QuickLinkCard({
  to,
  href,
  params,
  icon: Icon,
  title,
  description,
}: {
  to?: string;
  href?: string;
  params?: Record<string, string>;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  const body = (
    <Card className="hover:border-primary hover:bg-muted/30 cursor-pointer transition-colors">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-muted-foreground h-5 w-5" />
        </div>
        <div>
          <p className="text-foreground font-semibold">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  // Bull Board is served by the API, not the router, so it needs a plain anchor.
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }

  return (
    <Link to={to as never} params={params as never}>
      {body}
    </Link>
  );
}
