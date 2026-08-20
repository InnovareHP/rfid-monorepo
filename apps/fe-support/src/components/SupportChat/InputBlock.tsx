import { AI_REQUEST_ACTION_LABEL } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { LifeBuoy, Send } from "lucide-react";

type InputBlockProps = {
  disabled: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
  onRequestAssistance: () => void;
};

export const InputBlock = ({
  disabled,
  inputValue,
  setInputValue,
  handleSendMessage,
  onRequestAssistance,
}: InputBlockProps) => (
  <div className="p-4 border-t bg-background space-y-2">
    <div className="flex gap-2 min-w-0 items-center">
      <Input
        placeholder="Ask assistant anything..."
        className="rounded-xl flex-1 min-w-0 h-10 text-sm border-input bg-muted/30"
        value={inputValue}
        disabled={disabled}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
      />
      <Button
        type="button"
        size="icon"
        disabled={disabled}
        className="cursor-pointer shrink-0 rounded-full size-10 min-w-11 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90 touch-manipulation"
        onClick={handleSendMessage}
        aria-label="Send message"
      >
        <Send className="size-4" />
      </Button>
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onRequestAssistance}
      className="cursor-pointer w-full rounded-xl text-xs"
    >
      <LifeBuoy className="size-3.5" />
      {AI_REQUEST_ACTION_LABEL}
    </Button>
  </div>
);
