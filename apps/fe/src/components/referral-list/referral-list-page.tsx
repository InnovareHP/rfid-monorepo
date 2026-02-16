import ReusableTable from "@/components/reusable-table/reusable-table";
import { exportToCSV } from "@/lib/fe-helpers";
import { useTeamLayoutContext } from "@/routes/_team";
import {
  deleteReferral,
  getReferral,
} from "@/services/referral/referral-service";
import type { LeadRow, ReferralRow } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  getCoreRowModel,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import { Download, Plus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import ColumnFilter from "../master-list/column-filter";
import { MasterListFilters } from "../master-list/master-list-filter";
import { MasterListView } from "../master-list/master-list-view";
import { generateReferralColumns } from "./referral-list-column";

export default function ReferralListPage() {
  const { activeOrganizationId } = useTeamLayoutContext() as {
    activeOrganizationId: string;
  };
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [openMasterListView, setOpenMasterListView] = useState(false);
  const queryClient = useQueryClient();
  const [filterMeta, setFilterMeta] = useState({
    dateFrom: null,
    dateTo: null,
    filter: {},
    limit: 20,
  });

  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["referrals", filterMeta],
    queryFn: () => getReferral(filterMeta),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const rows = data?.pages.flatMap((p) => p.data) ?? [];

  const columns = generateReferralColumns(
    data?.pages[0].columns ?? [],
    (recordId: string) => {
      setSelectedRecordId(recordId);
      setOpenMasterListView(true);
    }
  ) as {
    id: string;
    name: string;
    type: string;
  }[];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  // const addReferralMutation = useMutation({
  //   mutationFn: createReferral,
  //   onMutate: async (newReferral) => {
  //     await queryClient.cancelQueries({ queryKey: ["referrals", filterMeta] });
  //     const previousData = queryClient.getQueryData(["referrals", filterMeta]);
  //     queryClient.setQueryData(["referrals", filterMeta], (old: any) => {
  //       if (!old) return old;
  //       return {
  //         ...old,
  //         pages: [
  //           {
  //             ...old.pages[0],
  //             data: [newReferral[0], ...old.pages[0].data],
  //           },
  //           ...old.pages.slice(1),
  //         ],
  //       };
  //     });
  //     return { previousData };
  //   },
  //   onError: (_err, _newLead, context: any) => {
  //     queryClient.setQueryData(["referrals", filterMeta], context.previousData);
  //     toast.error("Failed to add lead.");
  //   },
  //   onSettled: () => {
  //     queryClient.invalidateQueries({ queryKey: ["referrals", filterMeta] });
  //   },
  // });

  const deleteReferralMutation = useMutation({
    mutationFn: deleteReferral,
    onMutate: async (columnIds) => {
      await queryClient.cancelQueries({ queryKey: ["referrals", filterMeta] });
      const previousData = queryClient.getQueryData(["referrals", filterMeta]);
      queryClient.setQueryData(["referrals", filterMeta], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: { data: ReferralRow[] }) => ({
            ...page,
            data: page.data.filter(
              (r: ReferralRow) => !columnIds.includes(r.id)
            ),
          })),
        };
      });
      return { previousData };
    },
    onError: (_err, _ids, context: any) => {
      queryClient.setQueryData(["referrals", filterMeta], context.previousData);
      toast.error("Failed to delete leads.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals", filterMeta] });
    },
  });

  const handleDeleteReferrals = (columnIds: string[]) => {
    deleteReferralMutation.mutate(columnIds);
  };

  const handleExportCSV = async () => {
    if (rows.length === 0) {
      toast.error("No leads available to export.");
      return;
    }

    const limit = 100;
    let offset = 0;
    let allData: ReferralRow[] = [];

    let total = 0;
    let columns: any[] = [];

    do {
      const res = await getReferral({
        ...filterMeta,
        limit,
        offset,
      });

      if (offset === 0) {
        total = res.pagination.count;
        columns = res.columns;
      }

      columns = res.columns;
      allData = [...allData, ...res.data];
      offset += res.data.length;
    } while (offset < total);

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(allData, columns, `Referral_List_${timestamp}`, [], true);
    toast.success("CSV download started.");
  };

  const tableColumns = useMemo(() => {
    return table
      .getAllColumns()
      .filter(
        (column) =>
          column.id !== "view_referral" && column.id !== "create_column"
      )
      .map((column) => {
        const header = column.columnDef.header;
        let columnLabel = column.id || "Unnamed Column"; // Default to column id

        if (typeof header === "string") {
          columnLabel = header;
        } else if (typeof header === "function") {
          const renderedHeader = header({
            column,
            header: column.columnDef.header as unknown as Header<
              ReferralRow,
              unknown
            >,
            table,
          });

          if (React.isValidElement(renderedHeader)) {
            const props = renderedHeader.props as {
              children: string | string[];
            };
            if (typeof props.children === "string") {
              columnLabel = props.children;
            } else if (Array.isArray(props.children)) {
              columnLabel = props.children
                .map((child) => (typeof child === "string" ? child : ""))
                .join("");
            }
          }
        }

        return {
          label: columnLabel, // Extracted column name
          accessorFn: column.id,
          getCanHide: column.getCanHide,
          getIsVisible: column.getIsVisible,
          toggleVisibility: column.toggleVisibility,
        };
      });
  }, [table]);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <MasterListView
        open={openMasterListView}
        setOpen={setOpenMasterListView}
        leadId={selectedRecordId ?? ""}
        isReferral={true}
        hasNotification={
          selectedRecordId
            ? (data?.pages[0].data.find(
                (r: LeadRow) => r.id === selectedRecordId
              )?.has_notification ?? false)
            : false
        }
        initialTab="history"
      />
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Referral
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your referrals and export data for reporting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex items-center gap-2 border-gray-300 hover:bg-white hover:text-primary transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <ColumnFilter tableColumns={tableColumns as any} />
            <Link
              to="/$team/referral-list/create"
              className="flex items-center gap-2 shadow-sm"
              params={{ team: activeOrganizationId }}
            >
              <Button
                variant="default"
                className="flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Referral
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <MasterListFilters
          columns={data?.pages[0].columns ?? []}
          filterMeta={filterMeta}
          refetch={refetch}
          setFilterMeta={setFilterMeta}
          isReferral={true}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <ReusableTable
          table={table}
          columns={columns}
          isFetchingList={isFetchingNextPage || isFetching}
          onLoadMore={() => {
            if (hasNextPage) {
              fetchNextPage();
            }
          }}
          hasMore={hasNextPage}
          setActivePage={() => {}}
          onAdd={() => {}}
          onDelete={handleDeleteReferrals}
          isReferral={true}
        />
      </div>
    </div>
  );
}
