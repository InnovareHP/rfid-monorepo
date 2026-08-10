import type {
  PaymentMethodSummary,
  TransactionRow,
  TransactionType,
} from "@/services/billing/billing-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Landmark } from "lucide-react";

// Cells shared by both history tabs. Money and status render the same way whether
// the row came from Stripe or from our own ledger.

export const HISTORY_PAGE_SIZE = 10;

export const formatAmount = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

export const EmptyCell = () => (
  <span className="text-muted-foreground">&mdash;</span>
);

// Tabular figures so the column reads as a stack of numbers, not ragged text.
export const Amount = ({
  amountCents,
  currency,
}: {
  amountCents: number;
  currency: string;
}) => (
  <span className="font-medium tabular-nums">
    {formatAmount(amountCents, currency)}
  </span>
);

const INVOICE_STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  paid: { label: "Paid", variant: "success" },
  open: { label: "Open", variant: "warning" },
  draft: { label: "Draft", variant: "secondary" },
  uncollectible: { label: "Uncollectible", variant: "destructive" },
  void: { label: "Void", variant: "secondary" },
};

const TRANSACTION_STATUS: Record<
  TransactionRow["status"],
  { label: string; variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  COMPLETED: { label: "Paid", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  FAILED: { label: "Failed", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "secondary" },
};

// Always a word plus a colour, never colour alone.
export const StatusBadge = ({
  status,
  source,
}: {
  status: string;
  source: "invoice" | "transaction";
}) => {
  const entry =
    source === "invoice"
      ? INVOICE_STATUS[status]
      : TRANSACTION_STATUS[status as TransactionRow["status"]];

  if (!entry) return <Badge variant="secondary">{status}</Badge>;

  return <Badge variant={entry.variant}>{entry.label}</Badge>;
};

export const TYPE_LABEL: Record<TransactionType, string> = {
  SUBSCRIPTION: "Subscription",
  SEAT_CHANGE: "Seat change",
  REFUND: "Refund",
  OTHER: "Other",
};

// Brand renders as a word rather than a logo: the icon package that ships all 108
// card brands is not worth a dependency for one column.
export const PaymentMethodCell = ({
  method,
}: {
  method: PaymentMethodSummary | null;
}) => {
  if (!method) return <EmptyCell />;

  if (method.type === "us_bank_account") {
    return (
      <span className="inline-flex items-center gap-2">
        <Landmark className="h-4 w-4 text-muted-foreground" />
        <span>{method.brand ?? "Bank account"}</span>
        {method.last4 && (
          <span className="tabular-nums text-muted-foreground">
            &bull;&bull;&bull;&bull; {method.last4}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="capitalize">{method.brand ?? "Card"}</span>
      {method.last4 && (
        <span className="tabular-nums text-muted-foreground">
          &bull;&bull;&bull;&bull; {method.last4}
        </span>
      )}
    </span>
  );
};
