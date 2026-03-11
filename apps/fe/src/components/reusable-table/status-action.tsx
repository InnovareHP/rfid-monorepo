import {
  createDropdownOption,
  getDropdownOptions,
} from "@/services/lead/lead-service";
import {
  createReferralDropdownOption,
  getReferralDropdownOptions,
} from "@/services/referral/referral-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type StatusOption = {
  id: string;
  value: string;
  color?: string | null;
};

export function StatusSelect({
  val,
  fieldKey,
  handleUpdate,
  isReferral,
}: {
  val?: string;
  fieldKey: string;
  handleUpdate: (v: string, reason?: string) => void;
  isReferral?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reason, setReason] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");

  const queryKey = ["status-options", fieldKey];

  const { data: options = [] } = useQuery<StatusOption[]>({
    queryKey,
    queryFn: () =>
      isReferral
        ? getReferralDropdownOptions(fieldKey)
        : getDropdownOptions(fieldKey),
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: createOption, isPending: isCreating } = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) =>
      isReferral
        ? createReferralDropdownOption(fieldKey, name, color)
        : createDropdownOption(fieldKey, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAddingNew(false);
      setNewName("");
      setNewColor("#6b7280");
      toast.success("Status option created");
    },
  });

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setOpen(false);
    setReasonOpen(true);
  };

  const handleConfirm = () => {
    handleUpdate(selectedStatus, reason);
    setReason("");
    setReasonOpen(false);
  };

  const currentOption = options.find((o) => o.value === val);
  const currentColor = currentOption?.color || "#6b7280";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentColor }}
            />
            <span className="truncate max-w-[100px]">
              {val || "Select status"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-52 p-1" align="start">
          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleStatusClick(option.value)}
                className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer transition-colors"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: option.color || "#6b7280",
                  }}
                />
                <span className="truncate">{option.value}</span>
                {option.value === val && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] px-1 py-0"
                  >
                    current
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <div className="border-t mt-1 pt-1">
            {addingNew ? (
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-7 w-7 rounded border cursor-pointer shrink-0"
                  />
                  <Input
                    placeholder="Status name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newName.trim()) {
                        createOption({
                          name: newName.trim(),
                          color: newColor,
                        });
                      }
                      if (e.key === "Escape") setAddingNew(false);
                    }}
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs flex-1"
                    onClick={() => setAddingNew(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 text-xs flex-1"
                    disabled={!newName.trim() || isCreating}
                    onClick={() =>
                      createOption({ name: newName.trim(), color: newColor })
                    }
                  >
                    {isCreating ? "..." : "Add"}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingNew(true)}
                className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New status
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reason for {selectedStatus}</DialogTitle>
          </DialogHeader>

          <Input
            placeholder={`Enter reason for ${selectedStatus.toLowerCase()}...`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && reason.trim()) handleConfirm();
            }}
            autoFocus
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReasonOpen(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!reason.trim()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
