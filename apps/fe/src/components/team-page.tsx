import { PageHeader } from "@/components/page-header";
import { PasskeyResetModal } from "@/components/passkeys/passkey-reset-modal";
import { useEntitlement } from "@/hooks/use-entitlement";
import { authClient } from "@/lib/auth-client";
import { getComplianceStatus } from "@/services/compliance/compliance-service";
import { listMembers } from "@/services/team/team-service";
import { isOrgAdmin } from "@dashboard/shared";
import { Input } from "@dashboard/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Member } from "better-auth/plugins/organization";
import debounce from "lodash.debounce";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "./analytics/charts/kpi-stat-tile";
import { EditRoleDialog } from "./team/edit-role-dialog";
import {
  InviteMemberDialog,
  type InviteFormValues,
} from "./team/invite-member-dialog";
import { OrganizationCard } from "./team/organization-card";
import {
  PendingInvitationsTable,
  type InvitationRow,
} from "./team/pending-invitations-table";
import {
  TeamMembersTable,
  type TeamMemberRow,
} from "./team/team-members-table";

// Count bubble shown next to each tab label.
const TabCount = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-brand group-data-[state=inactive]:bg-blue-100 group-data-[state=inactive]:text-gray-500">
    {children}
  </span>
);

const tabTriggerClass =
  "group flex-none gap-2 rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-brand data-[state=active]:text-white data-[state=inactive]:text-muted-foreground";

const TeamPage = () => {
  const { data: organizationData } = authClient.useActiveOrganization();

  const queryClient = useQueryClient();
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    organizationData?.id,
  ]);
  const canManageTeam = isOrgAdmin(memberData?.role);

  // HIPAA mode limits membership to work email, and the invite form says so
  // before the API refuses the send. Compliance is admin only, so only the
  // roles that see the invite form read it.
  const { data: compliance } = useQuery({
    queryKey: ["compliance-status", organizationData?.id],
    enabled: !!organizationData?.id && canManageTeam,
    queryFn: getComplianceStatus,
    staleTime: 5 * 60 * 1000,
  });
  const { seats: seatLimit } = useEntitlement(organizationData?.id ?? "");

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [memberTableField, setMemberTableField] = useState({
    page: 1,
    limit: 10,
    search: "",
  });
  const [isOpenEditRoleDialog, setIsOpenEditRoleDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TeamMemberRow>();
  const [passkeyResetTarget, setPasskeyResetTarget] = useState<{
    memberId: string;
    email: string;
  } | null>(null);

  // Search hits the members query, so debounce keystrokes.
  const debouncedSearch = useMemo(
    () =>
      debounce((val: string) => {
        setMemberTableField((prev) => ({ ...prev, search: val, page: 1 }));
      }, 500),
    []
  );

  const { data: invitations } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data } = await authClient.organization.listInvitations({
        query: {
          organizationId: organizationData?.id ?? "",
        },
      });
      return data;
    },
  });

  // Better Auth's listMembers can only filter the member table's own columns,
  // so people search runs against the joined user through our own endpoint.
  const { data: employees, isLoading } = useQuery({
    queryKey: ["member", memberTableField],
    enabled: !!organizationData?.id,
    queryFn: () => listMembers(memberTableField),
  });

  const handleInvite = async (
    data: InviteFormValues,
    resetForm: () => void
  ) => {
    // The client returns the API error rather than throwing it, so a seat limit
    // or a HIPAA work-email refusal only reaches the owner if it is read here.
    const { error } = await authClient.organization.inviteMember({
      email: data.email,
      role: data.role as any,
      organizationId: organizationData?.id ?? "",
      resend: true,
    });

    if (error) {
      toast.error(error.message ?? "Failed to send invitation");
      return;
    }

    setIsInviteDialogOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["invitations"] });
    toast.success("Invitation sent successfully");
  };

  const handleResendInvitation = async (data: InvitationRow) => {
    const { error } = await authClient.organization.inviteMember({
      email: data.email,
      role: data.role as any,
      organizationId: data.organizationId,
      resend: true,
    });

    if (error) {
      toast.error(error.message ?? "Failed to send invitation");
      return;
    }

    toast.success("Invitation sent successfully");
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await authClient.organization.cancelInvitation({
        invitationId: invitationId,
      });

      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation cancelled successfully");
    } catch (error) {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleRemoveFromTeam = async (memberId: string) => {
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: organizationData?.id ?? "",
      });

      queryClient.invalidateQueries({ queryKey: ["member"] });
      toast.success("Member removed from team successfully");
    } catch (error) {
      toast.error("Failed to remove member from team");
    }
  };

  const handleEditRole = async (memberId: string, role: string) => {
    await authClient.organization.updateMemberRole(
      {
        memberId: memberId,
        role: role,
      },
      {
        onError: () => {
          toast.error("Failed to edit role");
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["member"] });
          toast.success("Role updated successfully");
        },
      }
    );
  };

  const teamStats = useMemo(() => {
    return {
      totalMembers: employees?.total,
      activeMembers: employees?.total,
      pendingInvites: invitations?.length,
    };
  }, [employees, invitations]);

  const members = employees?.members ?? [];

  // The API counts members plus pending invitations against the plan seats, so
  // the invite form gates on the same number instead of failing on submit.
  const pendingSeats =
    invitations?.filter((invitation: InvitationRow) => invitation.status === "pending")
      .length ?? 0;
  const seatsUsed = (employees?.total ?? 0) + pendingSeats;

  return (
    <div className="page-style rounded-xl">
      <div className="space-y-8">
        <div className="flex flex-wrap space-y-4 items-center justify-between">
          <PageHeader
            title="Team Management"
            description="Manage who has access to your organization and what they can see."
          />
          {canManageTeam && (
            <InviteMemberDialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
              workEmailOnly={compliance?.hipaaEnabled ?? false}
              organizationName={organizationData?.name}
              seatsUsed={seatsUsed}
              seatLimit={seatLimit}
              onInvite={handleInvite}
            />
          )}
        </div>

        <OrganizationCard
          organizationId={organizationData?.id}
          name={organizationData?.name}
          logo={organizationData?.logo}
          createdAt={organizationData?.createdAt}
          canEdit={canManageTeam}
        />

        {/* {canManageTeam && (
          <BrandingCard
            organizationId={organizationData?.id}
            metadata={organizationData?.metadata}
          />
        )} */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiStatTile
            label="Total Members"
            value={String(teamStats.totalMembers ?? 0)}
            isLoading={isLoading}
          />
          <KpiStatTile
            label="Active Members"
            value={String(teamStats.activeMembers ?? 0)}
            isLoading={isLoading}
          />
          <KpiStatTile
            label="Pending Invites"
            value={String(teamStats.pendingInvites ?? 0)}
          />
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-table-header p-1.5">
              {canManageTeam && (
                <>
                  <TabsTrigger value="members" className={tabTriggerClass}>
                    Team Members
                    <TabCount>{teamStats.totalMembers ?? 0}</TabCount>
                  </TabsTrigger>
                  <TabsTrigger value="invitations" className={tabTriggerClass}>
                    Pending Invitations
                    <TabCount>{teamStats.pendingInvites ?? 0}</TabCount>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {canManageTeam && (
              <div className="relative w-full sm:w-auto">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search"
                  defaultValue={memberTableField.search}
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="w-full bg-card pl-9 sm:w-64"
                />
              </div>
            )}
          </div>

          {canManageTeam && (
            <TabsContent value="members" className="space-y-6">
              <TeamMembersTable
                members={members}
                isLoading={isLoading}
                currentPage={memberTableField.page}
                totalCount={employees?.total}
                onPageChange={(page) =>
                  setMemberTableField((prev) => ({ ...prev, page }))
                }
                onEditRole={(member) => {
                  setSelectedRow(member);
                  setIsOpenEditRoleDialog(true);
                }}
                onResetPasskeys={(member) =>
                  setPasskeyResetTarget({
                    memberId: member.id,
                    email: member.user.email,
                  })
                }
                onRemove={handleRemoveFromTeam}
              />

              <EditRoleDialog
                open={isOpenEditRoleDialog}
                onOpenChange={setIsOpenEditRoleDialog}
                role={selectedRow?.role ?? undefined}
                onSelect={(role) => {
                  handleEditRole(selectedRow?.id as string, role);
                  setIsOpenEditRoleDialog(false);
                }}
              />
            </TabsContent>
          )}

          {canManageTeam && (
            <TabsContent value="invitations" className="space-y-6">
              <PendingInvitationsTable
                invitations={(invitations ?? []) as InvitationRow[]}
                onResend={handleResendInvitation}
                onRevoke={handleCancelInvitation}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <PasskeyResetModal
        memberId={passkeyResetTarget?.memberId ?? null}
        memberEmail={passkeyResetTarget?.email ?? null}
        onClose={() => setPasskeyResetTarget(null)}
      />
    </div>
  );
};

export default TeamPage;
