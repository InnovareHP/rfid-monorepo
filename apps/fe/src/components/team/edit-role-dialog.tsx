import { ROLE_LABELS, ROLES } from "@dashboard/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";

type EditRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: string;
  onSelect: (role: string) => void;
};

export function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSelect,
}: EditRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
        </DialogHeader>

        <Select value={role} onValueChange={onSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value={ROLES.LIAISON}>
              {ROLE_LABELS[ROLES.LIAISON]}
            </SelectItem>
            <SelectItem value={ROLES.ADMIN}>
              {ROLE_LABELS[ROLES.ADMIN]}
            </SelectItem>
            <SelectItem value={ROLES.MEMBER}>
              {ROLE_LABELS[ROLES.MEMBER]}
            </SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  );
}
