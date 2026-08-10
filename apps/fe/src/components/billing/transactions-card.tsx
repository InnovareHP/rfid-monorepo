import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { ActivityTable } from "./activity-table";
import { InvoicesTable } from "./invoices-table";

// Two sources, one card. Stripe invoices are the customer-facing receipts; the
// Activity tab is our own itemized ledger of what we charged and when.
export const TransactionsCard = () => (
  <Card>
    <CardHeader>
      <CardTitle>Billing History</CardTitle>
    </CardHeader>

    <CardContent>
      <Tabs defaultValue="invoices">
        <TabsList className="mb-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoicesTable />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTable />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
);
