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
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {PAGE_TITLE}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">{PAGE_DESCRIPTION}</p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-blue-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              {CARD_TITLE}
            </CardTitle>
            <CardDescription>{CARD_DESCRIPTION}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              From here you can open the <strong>Support Portal</strong> to
              search the knowledge base, browse resources, and chat with
              support. Use the sidebar to switch between this dashboard and the
              Support Portal at any time.
            </p>
            <Button
              variant="link"
              asChild
              className="h-auto p-0 text-blue-600 hover:text-blue-700"
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
