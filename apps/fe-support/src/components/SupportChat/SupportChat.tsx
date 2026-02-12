import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { Input } from "@dashboard/ui/components/input";
import { Textarea } from "@dashboard/ui/components/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import {
  ChevronUp,
  Send,
  RefreshCw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { AI_WELCOME_MESSAGE } from "@/lib/constants";

const TICKET_CATEGORIES = ["GENERAL", "TECHNICAL", "ACCOUNT", "OTHER"] as const;

const assistanceFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Please describe your issue"),
  category: z.enum(TICKET_CATEGORIES),
});

type AssistanceFormValues = z.infer<typeof assistanceFormSchema>;

function TypingText({
  text,
  speed = 25,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (displayed.length >= text.length) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [text, displayed, speed]);

  return (
    <p className={className}>
      {displayed}
      {!done && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse align-middle"
          aria-hidden
        />
      )}
    </p>
  );
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  showAssistanceForm?: boolean;
  formSubmitted?: boolean;
};

function AssistanceForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceFormSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      category: "GENERAL",
    },
  });

  const onSubmit = (data: AssistanceFormValues) => {
    // TODO: send to API when backend is ready
    console.log("Assistance form submitted:", data);
    form.reset();
    onSuccess();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 mt-2"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ticket title"
                  className="h-9 text-sm rounded-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Subject</FormLabel>
              <FormControl>
                <Input
                  placeholder="Brief subject"
                  className="h-9 text-sm rounded-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your issue or question..."
                  className="min-h-20 text-sm rounded-lg resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="h-9 text-sm rounded-lg w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TICKET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="sm"
          className="w-full cursor-pointer"
        >
          Submit request
        </Button>
      </form>
    </Form>
  );
}

export function SupportChat() {
  const [isChatEnlarged, setIsChatEnlarged] = useState(false);
  const [isOverlayClosing, setIsOverlayClosing] = useState(false);
  const [isOverlayOpening, setIsOverlayOpening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const overlayChatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = (
      el: HTMLDivElement | null
    ): ReturnType<typeof setTimeout> | undefined => {
      if (!el) return undefined;
      return setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 0);
    };
    const t1 = scrollToBottom(chatScrollRef.current);
    const t2 = scrollToBottom(overlayChatScrollRef.current);
    return () => {
      if (t1 !== undefined) clearTimeout(t1);
      if (t2 !== undefined) clearTimeout(t2);
    };
  }, [messages]);

  const handleSendMessage = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "assistant",
        content:
          "Please fill out the form below and we'll get back to you shortly.",
        showAssistanceForm: true,
      },
    ]);
  };

  const markFormSubmitted = (messageIndex: number) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === messageIndex ? { ...m, formSubmitted: true } : m
      )
    );
  };

  const openChatOverlay = () => {
    setIsChatEnlarged(true);
    setIsOverlayOpening(true);
  };
  const closeChatOverlay = () => {
    setIsOverlayClosing(true);
  };

  useEffect(() => {
    if (!isOverlayClosing) return;
    const t = setTimeout(() => {
      setIsChatEnlarged(false);
      setIsOverlayClosing(false);
    }, 300);
    return () => clearTimeout(t);
  }, [isOverlayClosing]);

  useEffect(() => {
    if (!isOverlayOpening || !isChatEnlarged) return;
    const id = requestAnimationFrame(() => {
      setTimeout(() => setIsOverlayOpening(false), 20);
    });
    return () => cancelAnimationFrame(id);
  }, [isOverlayOpening, isChatEnlarged]);

  const messageList = (
    <>
      <div className="rounded-xl bg-white p-4 border border-border shadow-sm max-w-[90%]">
        <div className="flex items-center gap-2 mb-1.5">
          <img
            src="/images/chat-logo.png"
            alt=""
            className="size-7 rounded-lg object-cover shrink-0"
            aria-hidden
          />
          <p className="text-xs font-medium text-muted-foreground">
            AI Assistant
          </p>
        </div>
        <TypingText
          text={AI_WELCOME_MESSAGE}
          speed={12}
          className="text-sm leading-relaxed text-foreground"
        />
      </div>
      {messages.map((msg, i) =>
        msg.role === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="rounded-[1.25rem] bg-primary text-primary-foreground px-4 py-2.5 min-h-[34px] flex items-center max-w-[90%] w-fit shadow-sm">
              <p className="text-sm font-medium">{msg.content}</p>
            </div>
          </div>
        ) : (
          <div key={i} className="flex justify-start">
            <div className="rounded-xl bg-white p-4 border border-border shadow-sm max-w-[90%]">
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src="/images/chat-logo.png"
                  alt=""
                  className="size-7 rounded-lg object-cover shrink-0"
                  aria-hidden
                />
                <p className="text-xs font-medium text-muted-foreground">
                  AI Assistant
                </p>
              </div>
              {msg.showAssistanceForm ? (
                msg.formSubmitted ? (
                  <p className="text-sm leading-relaxed text-green-600 dark:text-green-400">
                    Thank you! We've received your request and will get back to
                    you shortly.
                  </p>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-foreground">
                      {msg.content}
                    </p>
                    <AssistanceForm onSuccess={() => markFormSubmitted(i)} />
                  </>
                )
              ) : msg.content === "Thinking..." ? (
                <TypingText
                  text="Thinking..."
                  speed={40}
                  className="text-sm leading-relaxed text-foreground"
                />
              ) : (
                <p className="text-sm leading-relaxed text-foreground">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        )
      )}
    </>
  );

  const inputBlock = (
    <div className="p-4 border-t bg-background space-y-2">
      <div className="flex gap-2 min-w-0 items-center">
        <Input
          placeholder="Ask assistant anything..."
          className="rounded-xl flex-1 min-w-0 h-10 text-sm border-input bg-muted/30"
          value={inputValue}
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

  return (
    <>
      {/* Desktop: sidebar chat card */}
      <aside
        className={`hidden lg:flex flex-col min-h-0 w-full lg:max-w-[380px] shrink-0 order-2 transition-opacity duration-300 ${isChatEnlarged ? "pointer-events-none opacity-0" : ""}`}
      >
        <Card className="border rounded-xl overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 lg:flex-1 lg:max-h-[calc(100vh-7rem)]">
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background">
            <span className="font-semibold text-[15px] text-foreground">
              AI Assistant
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer size-8 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer size-8 text-muted-foreground hover:text-foreground"
                onClick={openChatOverlay}
                aria-label="Enlarge chat"
              >
                <Maximize2 className="size-4" />
              </Button>
            </div>
          </div>
          <div
            ref={chatScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4 overscroll-behavior-contain"
          >
            {messageList}
          </div>
          {inputBlock}
        </Card>
      </aside>

      {/* Mobile: fixed bottom bar to open chat */}
      <Button
        type="button"
        variant="ghost"
        onClick={openChatOverlay}
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex items-center justify-between gap-3 px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] h-auto bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)] rounded-t-xl hover:bg-muted/50 active:bg-muted/50 transition-colors"
        aria-label="Open AI Assistant chat"
      >
        <span className="font-semibold text-[15px] text-foreground">
          Innovare HP RFID AI Assistant
        </span>
        <ChevronUp className="size-5 text-muted-foreground shrink-0" aria-hidden />
      </Button>

      {/* Enlarged chat overlay */}
      {isChatEnlarged && (
        <div
          className={`fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOverlayClosing ? "opacity-0" : "opacity-100"}`}
          onClick={closeChatOverlay}
          aria-modal
          role="dialog"
          aria-label="AI Assistant (enlarged)"
        >
          <div
            className={`w-full md:max-w-2xl h-[90vh] md:h-[85vh] flex flex-col bg-background rounded-t-2xl md:rounded-xl overflow-hidden shadow-xl transition-transform duration-300 ease-out ${
              isOverlayClosing || isOverlayOpening
                ? "translate-y-full md:translate-y-0 md:scale-95"
                : "translate-y-0 md:scale-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background">
                <span className="font-semibold text-[15px] text-foreground">
                  AI Assistant
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer size-8 text-muted-foreground hover:text-foreground"
                    onClick={closeChatOverlay}
                    aria-label="Minimize chat"
                  >
                    <Minimize2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div
                ref={overlayChatScrollRef}
                className="flex-1 overflow-auto p-4 min-h-0 space-y-4"
              >
                {messageList}
              </div>
              {inputBlock}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
