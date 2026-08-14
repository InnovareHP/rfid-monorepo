import {
  getOrganization,
  type AdminOrganizationDetail,
  type AdminOrganizationMember,
} from "@/services/admin/admin-service";
import { formatDate } from "@dashboard/shared";
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
import { Skeleton } from "@dashboard/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  ShieldAlert,
  Users,
} from "lucide-react";
import { RoleBadge } from "../../Reusable/StatusBadges";
import { OrganizationComplianceCard } from "./OrganizationComplianceCard";
import { OrganizationEntitlementCard } from "./OrganizationEntitlementCard";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

const SUBSCRIPTION_VARIANTS: Record<string, BadgeVariant> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  canceled: "destructive",
  incomplete: "secondary",
};

function OrgInfoCard({ org }: { org: AdminOrganizationDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="text-muted-foreground h-5 w-5" />
          Organization Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-lg">
            <AvatarImage src={org.logo ?? undefined} />
            <AvatarFallback className="rounded-lg text-lg">
              {org.name?.charAt(0)?.toUpperCase() ?? "O"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{org.name}</p>
            {org.slug && (
              <p className="text-sm text-muted-foreground">{org.slug}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(org.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Members</p>
            <p className="font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {org.members.length}
            </p>
          </div>
        </div>
        {org.metadata && (
          <div className="pt-2 text-sm">
            <p className="text-muted-foreground">Metadata</p>
            <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
              {org.metadata}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({
  subscription,
}: {
  subscription: AdminOrganizationDetail["subscription"];
}) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="text-muted-foreground h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active subscription</p>
        </CardContent>
      </Card>
    );
  }

  const rows = [
    { label: "Plan", value: subscription.plan },
    {
      label: "Status",
      value: subscription.status ? (
        <Badge variant={SUBSCRIPTION_VARIANTS[subscription.status] ?? "outline"}>
          {subscription.status}
        </Badge>
      ) : (
        "\u2014"
      ),
    },
    {
      label: "Period Start",
      value: subscription.periodStart
        ? formatDate(subscription.periodStart)
        : "\u2014",
    },
    {
      label: "Period End",
      value: subscription.periodEnd
        ? formatDate(subscription.periodEnd)
        : "\u2014",
    },
    {
      label: "Trial Start",
      value: subscription.trialStart
        ? formatDate(subscription.trialStart)
        : "\u2014",
    },
    {
      label: "Trial End",
      value: subscription.trialEnd
        ? formatDate(subscription.trialEnd)
        : "\u2014",
    },
    { label: "Seats", value: subscription.seats ?? "\u2014" },
    {
      label: "Cancel at Period End",
      value: subscription.cancelAtPeriodEnd ? "Yes" : "No",
    },
    {
      label: "Cancel At",
      value: subscription.cancelAt
        ? formatDate(subscription.cancelAt)
        : "\u2014",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="text-muted-foreground h-5 w-5" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="text-muted-foreground font-medium w-[40%]">
                  {row.label}
                </TableCell>
                <TableCell>{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MembersCard({
  members,
  navigate,
}: {
  members: AdminOrganizationMember[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="text-muted-foreground h-5 w-5" />
          Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/50 hover:bg-muted/50 border-b-2">
              <TableHead className="text-foreground font-semibold">
                User
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Role
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Joined
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow
                key={m.memberId}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() =>
                  navigate({ to: `/admin/users/${m.user.id}` })
                }
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.user.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {m.user.name?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={m.role} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(m.joinedAt)}
                  </span>
                </TableCell>
                <TableCell>
                  {m.user.banned ? (
                    <Badge variant="destructive" className="gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Banned
                    </Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function OrganizationDetailPage() {
  const { orgId } = useParams({ strict: false }) as { orgId: string };
  const navigate = useNavigate();

  const { data: org, isLoading } = useQuery({
    queryKey: ["admin-organization", orgId],
    queryFn: () => getOrganization(orgId),
    enabled: !!orgId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/admin/organizations" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="page-title text-2xl font-bold tracking-tight sm:text-3xl">
              {org.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Organization details
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <OrgInfoCard org={org} />
          <SubscriptionCard subscription={org.subscription} />
          <OrganizationEntitlementCard org={org} />
          <OrganizationComplianceCard org={org} />
        </div>

        <MembersCard members={org.members} navigate={navigate} />
      </div>
    </div>
  );
}
