import {
  listOrganizations,
  type AdminOrganization,
} from "@/services/admin/admin-service";
import { formatDate } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Input } from "@dashboard/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Calendar, Search, Users } from "lucide-react";
import { useState } from "react";
import { ReusableTable } from "../../ReusableTable/ReusableTable";

const SUBSCRIPTION_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  trialing: "bg-blue-50 text-blue-700 border-blue-200",
  past_due: "bg-yellow-50 text-yellow-700 border-yellow-200",
  canceled: "bg-red-50 text-red-700 border-red-200",
  incomplete: "bg-gray-50 text-gray-700 border-gray-200",
};

export function OrganizationListPage() {
  const navigate = useNavigate();

  const [filterMeta, setFilterMeta] = useState({
    page: 1,
    take: 10,
    search: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-organizations", filterMeta],
    queryFn: () =>
      listOrganizations({
        page: filterMeta.page,
        take: filterMeta.take,
        ...(filterMeta.search ? { search: filterMeta.search } : {}),
      }),
  });

  const columns = [
    {
      key: "name",
      header: "Organization",
      render: (row: AdminOrganization) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-md">
            <AvatarImage src={row.logo ?? undefined} />
            <AvatarFallback className="rounded-md text-xs">
              {row.name?.charAt(0)?.toUpperCase() ?? "O"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground text-sm">{row.name}</p>
            {row.slug && (
              <p className="text-xs text-muted-foreground">{row.slug}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "memberCount",
      header: "Members",
      render: (row: AdminOrganization) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{row.memberCount}</span>
        </div>
      ),
    },
    {
      key: "subscription",
      header: "Subscription",
      render: (row: AdminOrganization) =>
        row.subscriptionStatus ? (
          <Badge
            variant="outline"
            className={SUBSCRIPTION_COLORS[row.subscriptionStatus] ?? ""}
          >
            {row.subscriptionStatus}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (row: AdminOrganization) => (
        <span className="text-sm">{row.subscriptionPlan ?? "\u2014"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row: AdminOrganization) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-sm">{formatDate(row.createdAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Organizations
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Browse and manage all organizations
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search by name or slug..."
              value={filterMeta.search}
              onChange={(e) =>
                setFilterMeta({
                  ...filterMeta,
                  search: e.target.value,
                  page: 1,
                })
              }
              className="pl-9"
            />
          </div>
        </div>

        <ReusableTable
          data={data?.organizations ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No organizations found"
          totalCount={data?.total ?? 0}
          currentPage={filterMeta.page}
          itemsPerPage={filterMeta.take}
          onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
          onRowClick={(row) =>
            navigate({ to: `/admin/organizations/${row.id}` })
          }
        />
      </div>
    </div>
  );
}
