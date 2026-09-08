import type { RecipientGroup } from "@/services/marketing/group-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Mail, Pencil, Trash2, Users } from "lucide-react";
import { ReportTable } from "../../reusable-table/report-table";

type GroupListTableProps = {
  groups: RecipientGroup[];
  isLoading?: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpen: (group: RecipientGroup) => void;
  onEdit: (group: RecipientGroup) => void;
  onDelete: (group: RecipientGroup) => void;
};

const criteriaSummary = (group: RecipientGroup) => {
  const parts: string[] = [];
  const fieldCount = Object.keys(group.filter?.filter ?? {}).length;

  if (fieldCount) {
    parts.push(`${fieldCount} field filter${fieldCount === 1 ? "" : "s"}`);
  }
  if (group.filter?.search) parts.push("search term");
  if (group.filter?.boardDateFrom || group.filter?.boardDateTo) {
    parts.push("date range");
  }

  return parts.length ? parts.join(", ") : "Everyone in the module";
};

export const GroupListTable = ({
  groups,
  isLoading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onEdit,
  onDelete,
}: GroupListTableProps) => (
  <ReportTable
    rows={groups}
    isLoading={isLoading}
    emptyMessage="No groups yet"
    currentPage={currentPage}
    pageSize={pageSize}
    totalCount={totalCount}
    onPageChange={onPageChange}
    onPageSizeChange={onPageSizeChange}
    tableClassName="table-fixed min-w-[900px]"
    columns={[
      {
        key: "name",
        header: "Group",
        className: "w-[26%]",
        render: (row: RecipientGroup) => (
          <button
            type="button"
            onClick={() => onOpen(row)}
            className="flex items-center gap-2 text-left font-medium text-foreground hover:text-primary"
          >
            <Users className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{row.name}</span>
          </button>
        ),
      },
      {
        key: "moduleType",
        header: "Module",
        className: "w-[12%] text-muted-foreground",
        render: (row: RecipientGroup) => row.moduleType,
      },
      {
        key: "criteria",
        header: "Criteria",
        className: "w-[24%] text-muted-foreground",
        render: (row: RecipientGroup) => criteriaSummary(row),
      },
      {
        key: "blasts",
        header: "Used By",
        className: "w-[13%] text-muted-foreground",
        render: (row: RecipientGroup) => (
          <span className="flex items-center gap-1.5">
            <Mail className="size-4 text-muted-foreground" />
            {row._count?.blasts ?? 0} Blasts
          </span>
        ),
      },
      {
        key: "updatedAt",
        header: "Last Updated",
        className: "w-[15%] text-muted-foreground",
        render: (row: RecipientGroup) => formatDateTime(row.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[10%]",
        render: (row: RecipientGroup) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              aria-label="Edit group"
              onClick={() => onEdit(row)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete group"
              onClick={() => onDelete(row)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ]}
  />
);
