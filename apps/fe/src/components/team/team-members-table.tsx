import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { cn } from "@dashboard/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { ReusableTable } from "../reusable-table/generic-table";
import { RoleBadge, TEAM_COLUMN_WIDTHS } from "./role-badge";

export type TeamMemberRow = {
  id: string;
  role?: string | null;
  createdAt?: string | Date | null;
  user: { id: string; name?: string | null; email: string };
};

type TeamMembersTableProps = {
  members: TeamMemberRow[];
  isLoading?: boolean;
  currentPage: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  onEditRole: (member: TeamMemberRow) => void;
  onResetPasskeys: (member: TeamMemberRow) => void;
  onRemove: (memberId: string) => void;
};

export function TeamMembersTable({
  members,
  isLoading,
  currentPage,
  totalCount,
  onPageChange,
  onEditRole,
  onResetPasskeys,
  onRemove,
}: TeamMembersTableProps) {
  return (
    <ReusableTable
      data={members}
      isLoading={isLoading}
      emptyMessage="No members found"
      currentPage={currentPage}
      itemsPerPage={10}
      totalCount={totalCount}
      onPageChange={onPageChange}
      tableClassName="table-fixed min-w-[900px]"
      columns={[
        {
          key: "user_name",
          header: "Name",
          className: TEAM_COLUMN_WIDTHS.name,
          render: (row: TeamMemberRow) => (
            <span className="font-medium text-gray-900">{row.user.name}</span>
          ),
        },
        {
          key: "user_email",
          header: "Email",
          className: cn("text-gray-600", TEAM_COLUMN_WIDTHS.email),
          render: (row: TeamMemberRow) => row.user.email,
        },
        {
          key: "member_position",
          header: "Role",
          className: TEAM_COLUMN_WIDTHS.role,
          render: (row: TeamMemberRow) => <RoleBadge role={row.role} />,
        },
        {
          key: "member_created_at",
          header: "Joined",
          className: cn("text-gray-600", TEAM_COLUMN_WIDTHS.date),
          render: (row: TeamMemberRow) =>
            row.createdAt
              ? formatDateTime(new Date(row.createdAt).toISOString())
              : "-",
        },
        {
          key: "action",
          header: "Action",
          className: TEAM_COLUMN_WIDTHS.action,
          render: (row: TeamMemberRow) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditRole(row)}>
                  Edit Role
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onResetPasskeys(row)}>
                  Reset Passkeys
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onRemove(row.id)}
                >
                  Remove From Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        },
      ]}
    />
  );
}
