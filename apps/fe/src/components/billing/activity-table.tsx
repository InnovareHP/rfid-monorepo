import {
  getTransactions,
  type TransactionRow,
} from "@/services/billing/billing-service";
import { formatDateTime } from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Amount,
  HISTORY_PAGE_SIZE,
  StatusBadge,
  TYPE_LABEL,
} from "./billing-history-shared";
import { ReportChip, ReportTable, type ReportColumn } from "../reusable-table/report-table";

const columns: ReportColumn<TransactionRow>[] = [
  {
    key: "createdAt",
    header: "Date",
    render: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "type",
    header: "Type",
    render: (row) => <ReportChip>{TYPE_LABEL[row.type]}</ReportChip>,
  },
  {
    key: "description",
    header: "Description",
    render: (row) => row.description,
  },
  {
    key: "amount",
    header: "Amount",
    render: (row) => (
      <Amount amountCents={row.amountCents} currency={row.currency} />
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} source="transaction" />,
  },
];

// Our own ledger, so this is true server paging with a real total.
export const ActivityTable = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(HISTORY_PAGE_SIZE);

  const params = { limit: pageSize, offset: (page - 1) * pageSize };

  const { data, isFetching } = useQuery({
    queryKey: ["billing-transactions", params],
    queryFn: () => getTransactions(params),
    placeholderData: (previous) => previous,
    staleTime: 60 * 1000,
  });

  return (
    <ReportTable
      columns={columns}
      rows={data?.data ?? []}
      isLoading={isFetching}
      emptyMessage="No billing activity yet"
      currentPage={page}
      pageSize={pageSize}
      totalCount={data?.total ?? 0}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
};
