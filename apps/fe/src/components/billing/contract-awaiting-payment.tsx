import type { ContractCard } from "@/services/billing/billing-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Clock, LogOut, RefreshCw } from "lucide-react";

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

// What a member sees while the organization's first contract invoice is
// outstanding. No payment link: only the billing role is handed one, and a
// hosted invoice url is a payment link to whoever holds it.
export function ContractAwaitingPayment({
  contract,
  onRetry,
  onLogout,
}: {
  contract: ContractCard;
  onRetry: () => void;
  onLogout: () => void;
}) {
  const invoice = contract.outstandingInvoice;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <CardTitle>Waiting on payment</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {contract.label ?? "Your organization's contract"} is set up, but
            its first invoice
            {invoice ? ` of ${money(invoice.amountDueCents)}` : ""} has not been
            paid yet. Your account opens as soon as it clears.
          </p>

          <p className="text-sm text-muted-foreground">
            Ask an owner in your organization to settle it from their billing
            page.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check again
            </Button>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
