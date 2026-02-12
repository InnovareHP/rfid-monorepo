import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Send } from "lucide-react";

type InputBlockProps = {
  disabled: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
};

export const InputBlock = ({
  disabled,
  inputValue,
  setInputValue,
  handleSendMessage,
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
        className="cursor-pointer shrink-0 rounded-full size-10 bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={handleSendMessage}
      >
        <Send className="size-4" />
      </Button>
    </div>
    <Button
      variant="link"
      className="cursor-pointer text-xs h-auto p-0 text-muted-foreground font-normal"
    >
      Get your own AI Chat with Innovare HP RFID
    </Button>
  </div>
);
