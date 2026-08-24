import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";

export type RecordAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
};

// One kebab per row instead of a button per action, so the name column keeps
// its width no matter how many actions a record grows.
// Hover reveal only from sm up, since a phone has no hover to reveal it with.
export const RecordActions = ({ actions }: { actions: RecordAction[] }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Record actions"
        className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-sm:opacity-100"
      >
        <MoreHorizontal className="size-4" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="w-44">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <DropdownMenuItem key={action.label} onSelect={action.onSelect}>
            <Icon className="size-4" />
            {action.label}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuContent>
  </DropdownMenu>
);
