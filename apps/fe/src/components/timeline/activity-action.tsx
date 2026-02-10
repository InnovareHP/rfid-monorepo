import { Button } from "@dashboard/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

 type ActivityActionProps = {
  handleEditActivity: () => void;
  handleDeleteActivity: () => void;
 };

const ActivityAction = ({ handleEditActivity, handleDeleteActivity }: ActivityActionProps) => {

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-card border border-border text-foreground"
      >
        <DropdownMenuItem className="hover:bg-muted" onClick={handleEditActivity}>
          Pin to top
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:bg-muted text-destructive" onClick={handleDeleteActivity}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActivityAction;
