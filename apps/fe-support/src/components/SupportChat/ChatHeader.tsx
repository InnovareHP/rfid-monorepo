import { Button } from "@dashboard/ui/components/button";
import { Maximize2, Minimize2, RefreshCw } from "lucide-react";

type ChatHeaderProps = {
  mode: "inline" | "overlay";
  onToggleSize: () => void;
  onReset: () => void;
  resetDisabled: boolean;
};

export const ChatHeader = ({
  mode,
  onToggleSize,
  onReset,
  resetDisabled,
}: ChatHeaderProps) => (
  <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background">
    <span className="font-semibold text-[15px] text-foreground">
      AI Assistant
    </span>
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="cursor-pointer size-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onReset}
        disabled={resetDisabled}
        aria-label="Start a new conversation"
      >
        <RefreshCw className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="cursor-pointer size-8 text-muted-foreground hover:text-foreground"
        onClick={onToggleSize}
        aria-label={mode === "inline" ? "Enlarge chat" : "Minimize chat"}
      >
        {mode === "inline" ? (
          <Maximize2 className="size-4" />
        ) : (
          <Minimize2 className="size-4" />
        )}
      </Button>
    </div>
  </div>
);
