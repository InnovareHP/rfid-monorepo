import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Link, useParams } from "@tanstack/react-router";
import { HelpCircle, LayoutDashboard } from "lucide-react";

const PAGE_TITLE = "Support Dashboard";
const PAGE_DESCRIPTION = "Your hub for help and resources";
const CARD_TITLE = "Welcome to the Support Dashboard";
const CARD_DESCRIPTION =
  "Use this dashboard to access support tools and get help when you need it.";
const SUPPORT_PORTAL_LINK_LABEL = "Go to Support Portal";

export function DashboardPage() {
  const params = useParams({ strict: false });
  const lang = (params as { lang?: string }).lang ?? "en";

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-muted via-primary/5 to-muted">
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-brand-rail-mid to-brand-rail-via flex items-center justify-center shadow-lg">
              <LayoutDashboard className="h-6 w-6 text-brand-rail-foreground" />
            </div>
            <div>
              <h1 className="page-title text-3xl font-bold tracking-tight">
                {PAGE_TITLE}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{PAGE_DESCRIPTION}</p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-primary/20 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="h-5 w-5 text-primary" />
              {CARD_TITLE}
            </CardTitle>
            <CardDescription>{CARD_DESCRIPTION}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              From here you can open the <strong>Support Portal</strong> to
              search the knowledge base, browse resources, and chat with
              support. Use the sidebar to switch between this dashboard and the
              Support Portal at any time.
            </p>
            <Button
              variant="link"
              asChild
              className="h-auto p-0 text-primary hover:text-primary"
            >
              <Link
                to="/$lang"
                params={{ lang }}
                className="inline-flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                {SUPPORT_PORTAL_LINK_LABEL}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
