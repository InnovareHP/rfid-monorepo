import { getLiaisons } from "@/services/options/options-service";
import type { TaskMemberDto } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

type AssigneePickerProps = {
  label: string;
  selected: TaskMemberDto[];
  onChange: (memberIds: string[]) => void;
  disabled?: boolean;
};

export const AssigneePicker = ({
  label,
  selected,
  onChange,
  disabled,
}: AssigneePickerProps) => {
  const membersQuery = useQuery({
    queryKey: ["member-options"],
    queryFn: () => getLiaisons(false),
    staleTime: 30 * 60 * 1000,
  });

  const members = membersQuery.data ?? [];
  const selectedIds = new Set(selected.map((member) => member.memberId));

  const toggle = (memberId: string) => {
    const next = new Set(selectedIds);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    onChange([...next]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selected.length > 0 && (
        <div className="flex -space-x-2">
          {selected.map((member) => (
            <Avatar
              key={member.memberId}
              className="h-7 w-7 border-2 border-white"
              title={member.name}
            >
              <AvatarImage src={member.image ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {member.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={disabled}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {members.length === 0 && (
              <p className="text-xs text-gray-400">No members found</p>
            )}
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(member.id)}
                  onCheckedChange={() => toggle(member.id)}
                />
                <span className="text-sm text-gray-800">{member.value}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
