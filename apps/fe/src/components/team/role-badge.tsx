import { formatCapitalize, ROLE_LABELS, ROLES } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { cn } from "@dashboard/ui/lib/utils";

// Both team tabs share these widths so columns do not shift when switching.
export const TEAM_COLUMN_WIDTHS = {
  name: "w-[22%]",
  email: "w-[28%]",
  role: "w-[18%]",
  date: "w-[20%]",
  action: "w-[12%]",
};

const ROLE_STYLES: Record<string, string> = {
  [ROLES.OWNER]: "bg-[#0D3185]",
  [ROLES.ADMIN]: "bg-[#1B5FBF]",
  [ROLES.MEMBER]: "bg-[#64D1F4]",
  [ROLES.LIAISON]: "bg-[#2C86D9]",
};

export function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return <span className="text-gray-400">-</span>;

  return (
    <Badge
      className={cn(
        "min-w-24 justify-center rounded-md border-transparent px-4 py-1 text-white",
        ROLE_STYLES[role] ?? ROLE_STYLES[ROLES.LIAISON]
      )}
    >
      {ROLE_LABELS[role] ?? formatCapitalize(role)}
    </Badge>
  );
}
