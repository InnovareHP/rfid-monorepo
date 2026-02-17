import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Shield } from "lucide-react";

export function AdminDashboardPage() {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Platform administration and support tools
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-blue-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-blue-600" />
              Welcome to the Admin Dashboard
            </CardTitle>
            <CardDescription>
              Use this dashboard to manage platform settings, view support
              tickets, and access admin tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              From here you can open the <strong>Support Portal</strong> to
              search the knowledge base, browse resources, and manage support
              requests. Use the sidebar to switch between this admin dashboard
              and the Support Portal at any time.
            </p>
            <Button
              variant="link"
              asChild
              className="cursor-pointer h-auto p-0 text-blue-600 hover:text-blue-700"
            >
              <Link
                to="/$lang"
                params={{ lang: "en" }}
                className="cursor-pointer inline-flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Go to Support Portal
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
