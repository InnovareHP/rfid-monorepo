import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { Shield, Ticket, Users } from "lucide-react";

// Dummy data for admin dashboard (replace with API when ready)
const TICKET_STATS = [
  { metric: "Total number of tickets", value: "1,247" },
  { metric: "Total number of opened tickets", value: "89" },
  { metric: "Total number of closed tickets", value: "1,158" },
];

const USER_STATS = [
  { metric: "Active users", value: "432" },
  { metric: "Banned users", value: "12" },
  { metric: "Verified users", value: "398" },
  { metric: "Unverified users", value: "34" },
];

export function AdminStatsDashboard() {
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
                Platform overview — tickets and user stats (dummy data)
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Ticket className="h-5 w-5 text-blue-600" />
                Tickets
              </CardTitle>
              <CardDescription>
                Support ticket counts across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-200 bg-blue-50/50 hover:bg-blue-50/50">
                    <TableHead className="font-semibold text-blue-900">
                      Metric
                    </TableHead>
                    <TableHead className="font-semibold text-blue-900 text-right">
                      Count
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TICKET_STATS.map((row, i) => (
                    <TableRow
                      key={row.metric}
                      className={
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }
                    >
                      <TableCell className="font-medium text-gray-900">
                        {row.metric}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-blue-600" />
                Users
              </CardTitle>
              <CardDescription>
                User account status breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-200 bg-blue-50/50 hover:bg-blue-50/50">
                    <TableHead className="font-semibold text-blue-900">
                      Metric
                    </TableHead>
                    <TableHead className="font-semibold text-blue-900 text-right">
                      Count
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {USER_STATS.map((row, i) => (
                    <TableRow
                      key={row.metric}
                      className={
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }
                    >
                      <TableCell className="font-medium text-gray-900">
                        {row.metric}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
