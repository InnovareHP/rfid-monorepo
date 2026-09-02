import type { ContractCard } from "@/services/billing/billing-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Separator } from "@dashboard/ui/components/separator";
import { ExternalLink, FileText } from "lucide-react";

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

const intervalLabel = (interval: string | null) =>
  interval === "monthly" ? "per month" : "per year";

export function ContractPlanCard({ contract }: { contract: ContractCard }) {
  const invoice = contract.outstandingInvoice;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Your plan</CardTitle>
        <Badge variant={invoice ? "outline" : "secondary"}>
          {invoice ? "Invoice due" : "Contract"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold">{contract.label ?? "Contract"}</p>
          <p className="text-sm text-muted-foreground">
            {contract.priceCents
              ? `${money(contract.priceCents)} ${intervalLabel(
                  contract.billingInterval
                )}`
              : "No charge"}
            {contract.seats ? ` · ${contract.seats} seats` : ""}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          This organization is on a negotiated contract. Seats and features are
          set by the agreement, so there is nothing to upgrade here. Invoices
          are sent each period and can be paid by card or bank transfer.
        </p>

        {invoice ? (
          <>
            <Separator />

            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {money(invoice.amountDueCents)} due
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.dueDate
                      ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}`
                      : "Payable now"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {invoice.pdfUrl ? (
                    <Button variant="outline" asChild>
                      <a href={invoice.pdfUrl} target="_blank" rel="noreferrer">
                        <FileText className="mr-2 h-4 w-4" />
                        PDF
                      </a>
                    </Button>
                  ) : null}

                  {invoice.hostedInvoiceUrl ? (
                    <Button asChild>
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Pay invoice
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
