import { getGmailStatus, getOutlookStatus } from "@/services/lead/lead-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Separator } from "@dashboard/ui/components/separator";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useQuery } from "@tanstack/react-query";
import {
  Bug,
  CalendarDays,
  CircleHelp,
  LifeBuoy,
  Mail,
  MessageSquareWarning,
  Sparkles,
  Wrench,
} from "lucide-react";

const faqItems = [
  {
    question: "Why can I not connect Gmail or Outlook?",
    answer:
      "Check that popups are allowed, then retry from Apps > Integrations. If the account is already linked, disconnect it first and reconnect to refresh tokens.",
  },
  {
    question: "My Master List or Referral CSV import fails. What should I check first?",
    answer:
      "Ensure required columns exist, remove empty header names, and use consistent date values. Then retry from Import > Master List or Import > Referral List.",
  },
  {
    question: "A teammate cannot access a page or action.",
    answer:
      "Verify role and organization membership under Team. Owner, Liason, and Admission Manager have different permissions across list, report, and billing pages.",
  },
  {
    question: "Analytics numbers look different from my list totals.",
    answer:
      "Check active date range and filters first. Master List Analytics and Referral Analytics reflect filtered data and may differ from unfiltered table totals.",
  },
  {
    question: "Mileage or Expense logs are not appearing in reports.",
    answer:
      "Confirm entries were saved under the correct team and date range. Then refresh Report > Mileage or Report > Expense with matching filters.",
  },
];

export default function HelpPage() {
  const gmailStatusQuery = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const outlookStatusQuery = useQuery({
    queryKey: ["outlook-status"],
    queryFn: getOutlookStatus,
  });

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="sticky top-0 z-40 border-b-2 border-blue-200 bg-white shadow-md">
        <div className="mx-auto max-w-7xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg">
              <CircleHelp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Help Center
              </h1>
              <p className="mt-0.5 text-sm text-gray-600">
                Find answers quickly, troubleshoot issues, and contact support.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">Quick Actions</CardTitle>
              <CardDescription>
                Fast paths for common CRM and team workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
              <Button variant="outline" className="justify-start border-blue-300 hover:bg-blue-50">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Contact Support Team
              </Button>
              <Button variant="outline" className="justify-start border-blue-300 hover:bg-blue-50">
                <Bug className="mr-2 h-4 w-4" />
                Report Import or Sync Bug
              </Button>
              <Button variant="outline" className="justify-start border-blue-300 hover:bg-blue-50">
                <Sparkles className="mr-2 h-4 w-4" />
                Request CRM Feature
              </Button>
              <Button variant="outline" className="justify-start border-blue-300 hover:bg-blue-50">
                <CalendarDays className="mr-2 h-4 w-4" />
                Book Team Onboarding Call
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">Search Help</CardTitle>
              <CardDescription>
                Search help for modules you use daily
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Input placeholder="Search: master list, referral list, mileage report, team roles..." />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Master List</Badge>
                <Badge variant="secondary">Referral List</Badge>
                <Badge variant="secondary">Integrations</Badge>
                <Badge variant="secondary">Team & Roles</Badge>
                <Badge variant="secondary">Mileage/Expense Reports</Badge>
                <Badge variant="secondary">County Config</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">Frequently Asked Questions</CardTitle>
              <CardDescription>
                Common issues across import, analytics, and reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {faqItems.map((item, index) => (
                <div key={item.question}>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                    <p className="font-semibold text-gray-900">{item.question}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.answer}</p>
                  </div>
                  {index < faqItems.length - 1 ? <Separator className="my-3 bg-transparent" /> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">Integration Health</CardTitle>
              <CardDescription>Current connection status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800">
                Email sync powers activity workflows and outbound follow-ups from your connected provider.
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Gmail</span>
                </div>
                <Badge variant={gmailStatusQuery.data?.connected ? "default" : "secondary"}>
                  {gmailStatusQuery.data?.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Outlook</span>
                </div>
                <Badge variant={outlookStatusQuery.data?.connected ? "default" : "secondary"}>
                  {outlookStatusQuery.data?.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">Submit a Request</CardTitle>
              <CardDescription>
                Share full context so we can troubleshoot quickly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input placeholder="What do you need help with?" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Include team, page path, what happened, expected result, and steps to reproduce."
                  className="min-h-28"
                />
              </div>
              <Button className="w-full">
                <MessageSquareWarning className="mr-2 h-4 w-4" />
                Send Request
              </Button>
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <Wrench className="h-3.5 w-3.5" />
                This is scaffolded UI; backend submission can be wired next.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
