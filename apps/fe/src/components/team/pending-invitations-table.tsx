import { formatDateTime } from "@dashboard/shared";
import { cn } from "@dashboard/ui/lib/utils";
import type { Invitation } from "better-auth/plugins";
import { ReusableTable } from "../reusable-table/generic-table";
import { RoleBadge, TEAM_COLUMN_WIDTHS } from "./role-badge";

export type InvitationRow = Invitation & { createdAt?: string | Date | null };

type PendingInvitationsTableProps = {
  invitations: InvitationRow[];
  onResend: (invitation: InvitationRow) => void;
  onRevoke: (invitationId: string) => void;
};

// Invitations only carry an email, so the name column reads off the local part.
const nameFromEmail = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function PendingInvitationsTable({
  invitations,
  onResend,
  onRevoke,
}: PendingInvitationsTableProps) {
  return (
    <ReusableTable
      data={invitations}
      emptyMessage="No pending invitations"
      tableClassName="table-fixed min-w-[900px]"
      columns={[
        {
          key: "name",
          header: "Name",
          className: TEAM_COLUMN_WIDTHS.name,
          render: (row: InvitationRow) => (
            <span className="font-medium text-gray-900">
              {nameFromEmail(row.email)}
            </span>
          ),
        },
        {
          key: "email",
          header: "Email",
          className: cn("text-gray-600", TEAM_COLUMN_WIDTHS.email),
          render: (row: InvitationRow) => row.email,
        },
        {
          key: "role",
          header: "Role",
          className: TEAM_COLUMN_WIDTHS.role,
          render: (row: InvitationRow) => <RoleBadge role={row.role} />,
        },
        {
          key: "createdAt",
          header: "Date Sent",
          className: cn("text-gray-600", TEAM_COLUMN_WIDTHS.date),
          render: (row: InvitationRow) =>
            row.createdAt
              ? formatDateTime(new Date(row.createdAt).toISOString())
              : "-",
        },
        {
          key: "action",
          header: "Action",
          className: TEAM_COLUMN_WIDTHS.action,
          render: (row: InvitationRow) => (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onResend(row)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Resend
              </button>
              <button
                type="button"
                onClick={() => onRevoke(row.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Revoke
              </button>
            </div>
          ),
        },
      ]}
    />
  );
}
