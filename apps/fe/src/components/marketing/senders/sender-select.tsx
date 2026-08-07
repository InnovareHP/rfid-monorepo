import { getSenders } from "@/services/marketing/sender-service";
import { Button } from "@dashboard/ui/components/button";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SenderSetupDialog } from "./sender-setup-dialog";

const NO_SENDER = "none";

type SenderSelectProps = {
  value: string | null;
  onChange: (senderIdentityId: string | null) => void;
};

export function SenderSelect({ value, onChange }: SenderSelectProps) {
  const [setupOpen, setSetupOpen] = useState(false);

  const { data: senders = [] } = useQuery({
    queryKey: ["marketing-senders"],
    queryFn: getSenders,
  });

  // An unverified domain cannot send, so offering it here would only produce a
  // failure at send time.
  const selectable = senders.filter((sender) => sender.status === "VERIFIED");

  return (
    <div className="space-y-2">
      <Label htmlFor="campaign-sender">Send From</Label>
      <div className="flex gap-2">
        <Select
          value={value ?? NO_SENDER}
          onValueChange={(next) =>
            onChange(next === NO_SENDER ? null : next)
          }
        >
          <SelectTrigger id="campaign-sender" className="w-full">
            <SelectValue placeholder="Default sending address" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SENDER}>Default sending address</SelectItem>
            {selectable.map((sender) => (
              <SelectItem key={sender.id} value={sender.id}>
                {sender.label} — {sender.fromEmail}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          aria-label="Add a sender"
          onClick={() => setSetupOpen(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <SenderSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onCreated={(sender) => {
          if (sender.status === "VERIFIED") onChange(sender.id);
        }}
      />
    </div>
  );
}
