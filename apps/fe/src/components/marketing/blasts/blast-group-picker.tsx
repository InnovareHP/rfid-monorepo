import { getGroups } from "@/services/marketing/group-service";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ExternalLink, Users } from "lucide-react";

type BlastGroupPickerProps = {
  moduleType: string;
  value: string[];
  disabled?: boolean;
  onChange: (groupIds: string[]) => void;
};

export function BlastGroupPicker({
  moduleType,
  value,
  disabled,
  onChange,
}: BlastGroupPickerProps) {
  const { team } = useParams({ strict: false }) as { team: string };

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["marketing-groups"],
    queryFn: getGroups,
  });

  // A group targets one module, so only the matching ones can be picked here.
  const selectable = groups.filter((group) => group.moduleType === moduleType);

  const toggle = (groupId: string) => {
    onChange(
      value.includes(groupId)
        ? value.filter((id) => id !== groupId)
        : [...value, groupId]
    );
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading groups...</p>;
  }

  if (selectable.length === 0) {
    return (
      <div className="rounded-lg border border-blue-200 bg-[#F4F9FF] p-4 text-sm text-gray-700">
        No groups target {moduleType.toLowerCase()} records yet.{" "}
        <Link
          to="/$team/marketing/groups"
          params={{ team }}
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>{" "}
        to choose an audience.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectable.map((group) => {
        const checked = value.includes(group.id);

        return (
          <div
            key={group.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 transition-colors",
              checked ? "border-brand bg-[#F4F9FF]" : "border-gray-200"
            )}
          >
            <Checkbox
              id={`group-${group.id}`}
              checked={checked}
              disabled={disabled}
              onCheckedChange={() => toggle(group.id)}
            />
            <label
              htmlFor={`group-${group.id}`}
              className="flex flex-1 cursor-pointer items-center gap-2"
            >
              <Users className="size-4 shrink-0 text-gray-400" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-gray-900">
                  {group.name}
                </span>
                {group.description && (
                  <span className="block text-xs text-muted-foreground">
                    {group.description}
                  </span>
                )}
              </span>
            </label>
            <Link
              to="/$team/marketing/groups/$groupId"
              params={{ team, groupId: group.id }}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View recipients
              <ExternalLink className="size-3" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
