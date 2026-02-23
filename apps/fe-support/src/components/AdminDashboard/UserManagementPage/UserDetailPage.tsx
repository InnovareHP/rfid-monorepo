import { DASHBOARD_URL, ROLES } from "@/lib/contant";
import {
  banUser,
  getUser,
  impersonateUser,
  removeUser,
  revokeSession,
  setUserRole,
  unbanUser,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
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
import { Separator } from "@dashboard/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  LogOut,
  Mail,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Trash2,
  User,
  UserCog,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BanUserDialog } from "./BanUserDialog";

const ROLE_LABELS = {
  [ROLES.USER]: "User",
  [ROLES.SUPPORT]: "Support",
  [ROLES.SUPER_ADMIN]: "Super Admin",
} as const;

const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  liason: "Liaison",
  admission_manager: "Admission Manager",
};

function RoleBadge({ role }: { role: string }) {
  const variant =
    role === ROLES.SUPER_ADMIN
      ? "default"
      : role === ROLES.SUPPORT
        ? "secondary"
        : "outline";
  return (
    <Badge variant={variant}>
      {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
    </Badge>
  );
}

function MemberRoleBadge({ role }: { role: string }) {
  const variant = role === "owner" ? "default" : "secondary";
  return <Badge variant={variant}>{MEMBER_ROLE_LABELS[role] ?? role}</Badge>;
}

export function UserDetailPage({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [banOpen, setBanOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getUser(userId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const banMutation = useMutation({
    mutationFn: ({
      reason,
      expiresIn,
    }: {
      reason?: string;
      expiresIn?: number;
    }) => banUser(userId, reason, expiresIn),
    onSuccess: () => {
      toast.success("User banned");
      setBanOpen(false);
      invalidate();
    },
    onError: () => toast.error("Failed to ban user"),
  });

  const unbanMutation = useMutation({
    mutationFn: () => unbanUser(userId),
    onSuccess: () => {
      toast.success("User unbanned");
      invalidate();
    },
    onError: () => toast.error("Failed to unban user"),
  });

  const roleMutation = useMutation({
    mutationFn: (role: string) => setUserRole(userId, role),
    onSuccess: () => {
      toast.success("Role updated");
      invalidate();
    },
    onError: () => toast.error("Failed to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeUser(userId),
    onSuccess: () => {
      toast.success("User removed");
      navigate({ to: "/admin/users" });
    },
    onError: () => toast.error("Failed to remove user"),
  });

  const impersonateMutation = useMutation({
    mutationFn: () => impersonateUser(userId),
    onSuccess: () => {
      toast.success("Now impersonating user");
      window.location.href = DASHBOARD_URL;
    },
    onError: () => toast.error("Failed to impersonate user"),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: () => revokeSession(userId),
    onSuccess: () => {
      toast.success("Sessions revoked");
      invalidate();
    },
    onError: () => toast.error("Failed to revoke sessions"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Loading user...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" asChild>
          <Link to="/admin/users">Back to users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              User Details
            </h1>
          </div>
          <ActionsDropdown
            user={user}
            onBan={() => setBanOpen(true)}
            onUnban={() => unbanMutation.mutate()}
            onRemove={() => setRemoveOpen(true)}
            onImpersonate={() => impersonateMutation.mutate()}
            onRevokeSession={() => revokeSessionMutation.mutate()}
            onRoleChange={(role) => roleMutation.mutate(role)}
            isPending={
              unbanMutation.isPending ||
              impersonateMutation.isPending ||
              revokeSessionMutation.isPending ||
              roleMutation.isPending
            }
          />
        </div>

        {/* User Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="text-lg">
                  {user.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {user.name}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <RoleBadge role={user.role} />
                    <Badge variant={user.banned ? "destructive" : "outline"}>
                      {user.banned ? "Banned" : "Active"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {user.emailVerified ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <span>
                      Email {user.emailVerified ? "verified" : "not verified"}
                    </span>
                  </div>
                </div>

                {user.banned && user.banReason && (
                  <>
                    <Separator />
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                      <p className="font-medium text-destructive">
                        Ban reason:
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {user.banReason}
                      </p>
                      {user.banExpires && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Expires:{" "}
                          {new Date(user.banExpires).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Organizations ({user.organizations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                This user is not a member of any organization.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Member Since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {org.logo ? (
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={org.logo} />
                              <AvatarFallback className="text-xs">
                                {org.name?.charAt(0) ?? "O"}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{org.name}</p>
                            {org.slug && (
                              <p className="text-xs text-muted-foreground">
                                {org.slug}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <MemberRoleBadge role={org.memberRole} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(org.memberSince)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ban dialog */}
      <BanUserDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        userName={user.name}
        isPending={banMutation.isPending}
        onConfirm={(reason, expiresIn) =>
          banMutation.mutate({
            reason: reason || undefined,
            expiresIn,
          })
        }
      />

      {/* Remove confirmation dialog */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{user.name}</strong> (
              {user.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate()}
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

function ActionsDropdown({
  user,
  onBan,
  onUnban,
  onRemove,
  onImpersonate,
  onRevokeSession,
  onRoleChange,
  isPending,
}: {
  user: AdminUser;
  onBan: () => void;
  onUnban: () => void;
  onRemove: () => void;
  onImpersonate: () => void;
  onRevokeSession: () => void;
  onRoleChange: (role: string) => void;
  isPending: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <MoreHorizontal className="mr-2 h-4 w-4" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.banned ? (
          <DropdownMenuItem onClick={onUnban}>
            <ShieldOff className="mr-2 h-4 w-4" />
            Unban user
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onBan}>
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
                disabled={user.role === value}
                onClick={() => onRoleChange(value)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onImpersonate}>
          <User className="mr-2 h-4 w-4" />
          Impersonate user
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onRevokeSession}>
          <LogOut className="mr-2 h-4 w-4" />
          Revoke sessions
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onRemove}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
