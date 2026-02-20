import { CANNED_RESPONSES } from "@/lib/contant";
import { Button } from "@dashboard/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { Zap } from "lucide-react";
import { useState } from "react";

interface CannedResponsesProps {
  onSelect: (text: string) => void;
}

export function CannedResponses({ onSelect }: CannedResponsesProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (text: string) => {
    onSelect(text);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Templates
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="top"
        sideOffset={8}
      >
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Quick replies</p>
          <p className="text-xs text-muted-foreground">
            Click to insert into reply box
          </p>
        </div>
        <ScrollArea className="max-h-72">
          <div className="p-1.5 space-y-0.5">
            {CANNED_RESPONSES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r.text)}
                className="w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted focus:outline-none focus:bg-muted"
              >
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {r.text}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
