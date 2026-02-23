import { ROLES } from "@/lib/contant";
import {
  banUser,
  impersonateUser,
  listUsers,
  removeUser,
  revokeSession,
  setUserRole,
  unbanUser,
  verifyEmail,
  type AdminUser,
} from "@/services/admin/admin-service";
import { formatDate } from "@dashboard/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dashboard/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  LogOut,
  MoreHorizontal,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  User,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RoleBadge, StatusBadge } from "../../Reusable/StatusBadges";
import { ReusableTable } from "../../ReusableTable/ReusableTable";
import { BanUserDialog } from "./BanUserDialog";

const ROLE_LABELS = {
  [ROLES.USER]: "User",
  [ROLES.SUPPORT]: "Support",
  [ROLES.SUPER_ADMIN]: "Super Admin",
} as const;

const ROLE_OPTIONS = [
  { label: "All roles", value: "ALL" },
  { label: "User", value: ROLES.USER },
  { label: "Support", value: ROLES.SUPPORT },
  { label: "Super Admin", value: ROLES.SUPER_ADMIN },
] as const;

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [filterMeta, setFilterMeta] = useState({
    page: 1,
    take: 10,
    search: "",
    roleFilter: "ALL",
  });

  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", filterMeta],
    queryFn: () =>
      listUsers({
        take: filterMeta.take,
        page: filterMeta.page,
        ...(filterMeta.search ? { search: filterMeta.search } : {}),
        ...(filterMeta.roleFilter !== "ALL"
          ? { roleFilter: filterMeta.roleFilter }
          : {}),
      }),
  });

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-banned-count"] });
  };

  const banMutation = useMutation({
    mutationFn: ({
      userId,
      reason,
      expiresIn,
    }: {
      userId: string;
      reason?: string;
      expiresIn?: number;
    }) => banUser(userId, reason, expiresIn),
    onSuccess: () => {
      toast.success("User banned");
      setBanTarget(null);
      invalidateUsers();
    },
    onError: () => toast.error("Failed to ban user"),
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: () => {
      toast.success("User unbanned");
      invalidateUsers();
    },
    onError: () => toast.error("Failed to unban user"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      setUserRole(userId, role),
    onSuccess: () => {
      toast.success("Role updated");
      invalidateUsers();
    },
    onError: () => toast.error("Failed to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeUser(userId),
    onSuccess: () => {
      toast.success("User removed");
      setRemoveTarget(null);
      invalidateUsers();
    },
    onError: () => toast.error("Failed to remove user"),
  });

  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => impersonateUser(userId),
    onSuccess: () => {
      toast.success("User impersonated");
      invalidateUsers();
      window.location.href = import.meta.env.VITE_DASHBOARD_URL;
    },
    onError: () => toast.error("Failed to impersonate user"),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: () => {
      toast.success("Session revoked");
      invalidateUsers();
    },
    onError: () => toast.error("Failed to revoke impersonation"),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (userId: string) => verifyEmail(userId),
    onSuccess: () => {
      toast.success("Email verified");
      invalidateUsers();
    },
    onError: () => toast.error("Failed to verify email"),
  });

  const columns = [
    {
      key: "name",
      header: "User",
      render: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.image ?? undefined} />
            <AvatarFallback className="text-xs">
              {row.name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground text-sm">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row: AdminUser) => <RoleBadge role={row.role} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row: AdminUser) => <StatusBadge banned={row.banned} />,
    },
    {
      key: "emailVerified",
      header: "Verified",
      render: (row: AdminUser) => (
        <Badge variant={row.emailVerified ? "outline" : "secondary"}>
          {row.emailVerified ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "organizations",
      header: "Organizations",
      render: (row: AdminUser) =>
        row.organizations.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No organizations
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.organizations.slice(0, 2).map((org) => (
              <Badge key={org.id} variant="outline" className="text-xs gap-1">
                <Building2 className="h-3 w-3" />
                {org.name}
              </Badge>
            ))}
            {row.organizations.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{row.organizations.length - 2}
              </Badge>
            )}
          </div>
        ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row: AdminUser) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-sm">{formatDate(row.createdAt)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      render: (row: AdminUser) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.banned ? (
              <DropdownMenuItem
                onClick={() => unbanMutation.mutate(row.id)}
                disabled={unbanMutation.isPending}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Unban user
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setBanTarget(row)}>
                <Shield className="mr-2 h-4 w-4" />
                Ban user
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserCog className="mr-2 h-4 w-4" />
                Set role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    disabled={row.role === value}
                    onClick={() =>
                      roleMutation.mutate({ userId: row.id, role: value })
                    }
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => impersonateMutation.mutate(row.id)}
              disabled={impersonateMutation.isPending}
            >
              <User className="mr-2 h-4 w-4" />
              Impersonate user
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => revokeSessionMutation.mutate(row.id)}
              disabled={revokeSessionMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Revoke session
            </DropdownMenuItem>
            {!row.emailVerified && (
              <DropdownMenuItem
                onClick={() => verifyEmailMutation.mutate(row.id)}
                disabled={verifyEmailMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Verify email
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setRemoveTarget(row)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View, search, and manage platform users
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search by name or email..."
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
          <Select
            value={filterMeta.roleFilter}
            onValueChange={(value) =>
              setFilterMeta({ ...filterMeta, roleFilter: value, page: 1 })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ReusableTable
          data={data?.users ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No users found"
          totalCount={data?.total ?? 0}
          currentPage={filterMeta.page}
          itemsPerPage={filterMeta.take}
          onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
          onRowClick={(row) =>
            navigate({ to: `/admin/users/${row.id as string}` })
          }
        />
      </div>

      {/* Ban dialog */}
      <BanUserDialog
        open={!!banTarget}
        onOpenChange={(open) => !open && setBanTarget(null)}
        userName={banTarget?.name ?? ""}
        isPending={banMutation.isPending}
        onConfirm={(reason, expiresIn) =>
          banTarget &&
          banMutation.mutate({
            userId: banTarget.id,
            reason: reason || undefined,
            expiresIn,
          })
        }
      />

      {/* Remove confirmation dialog */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{removeTarget?.name}</strong>{" "}
              ({removeTarget?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removeTarget && removeMutation.mutate(removeTarget.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? "Removing..." : "Remove user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
