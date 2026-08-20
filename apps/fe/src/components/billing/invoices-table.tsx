import {
  getInvoices,
  type InvoiceRow,
} from "@/services/billing/billing-service";
import { formatDateTime } from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import {
  Amount,
  EmptyCell,
  HISTORY_PAGE_SIZE,
  PaymentMethodCell,
  StatusBadge,
} from "./billing-history-shared";
import { ReportTable, type ReportColumn } from "../reusable-table/report-table";

const columns: ReportColumn<InvoiceRow>[] = [
  {
    key: "created",
    header: "Date",
    render: (row) => formatDateTime(row.created),
  },
  {
    key: "number",
    header: "Invoice",
    render: (row) => row.number ?? <EmptyCell />,
  },
  {
    key: "paymentMethod",
    header: "Payment method",
    render: (row) => <PaymentMethodCell method={row.paymentMethod} />,
  },
  {
    key: "amount",
    header: "Amount",
    render: (row) => (
      <Amount
        amountCents={row.status === "paid" ? row.amountPaid : row.amountDue}
        currency={row.currency}
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} source="invoice" />,
  },
  {
    key: "receipt",
    header: "Receipt",
    // Stripe renders the PDF asynchronously, so the hosted page is the fallback.
    render: (row) => {
      const href = row.invoicePdf ?? row.hostedInvoiceUrl;
      if (!href) return <EmptyCell />;

      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <FileText className="h-4 w-4" />
          View
        </a>
      );
    },
  },
];

// Stripe pages by cursor, not offset, so one page of 50 is fetched and sliced
// locally rather than pretending the table can jump to an arbitrary page.
export const InvoicesTable = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(HISTORY_PAGE_SIZE);

  const { data, isFetching } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => getInvoices(),
    staleTime: 60 * 1000,
  });

  const rows = data?.data ?? [];
  const start = (page - 1) * pageSize;

  return (
    <ReportTable
      columns={columns}
      rows={rows.slice(start, start + pageSize)}
      isLoading={isFetching}
      emptyMessage="No invoices yet"
      currentPage={page}
      pageSize={pageSize}
      totalCount={rows.length}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
};
