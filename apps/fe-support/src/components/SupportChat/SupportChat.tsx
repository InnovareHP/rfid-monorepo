import { TypingText } from "@/lib/typing-text-hook";
import { AI_WELCOME_MESSAGE, type ChatMessage } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { ChevronUp, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AssistanceForm } from "./AssistanceForm";
import { InputBlock } from "./InputBlock";

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

    const isContactForm = text.toLowerCase() === "contact form";

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      isContactForm
        ? {
            role: "assistant",
            content:
              "Please fill out the form below and we'll get back to you shortly.",
            showAssistanceForm: true,
          }
        : {
            role: "assistant",
            content: "Thinking...",
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
            <div className="rounded-xl bg-white p-4 border border-border shadow-sm max-w-[90%] w-full">
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
              {msg.showAssistanceForm || msg.content === "contact form" ? (
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

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col min-h-0 w-full lg:max-w-[500px] shrink-0 order-2 transition-opacity duration-300 ${isChatEnlarged ? "pointer-events-none opacity-0" : ""}`}
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
          <InputBlock
            disabled={false}
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendMessage={handleSendMessage}
          />
        </Card>
      </aside>

      <Button
        type="button"
        variant="ghost"
        onClick={openChatOverlay}
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex items-center justify-between gap-3 px-4 py-3.5 min-h-14 pb-[max(0.875rem,env(safe-area-inset-bottom))] h-auto bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)] rounded-t-xl hover:bg-muted/50 active:bg-muted/50 transition-colors touch-manipulation"
        aria-label="Open AI Assistant chat"
      >
        <span className="font-semibold text-[15px] text-foreground">
          Innovare HP RFID AI Assistant
        </span>
        <ChevronUp
          className="size-5 text-muted-foreground shrink-0"
          aria-hidden
        />
      </Button>

      {isChatEnlarged && (
        <div
          className={`fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOverlayClosing ? "opacity-0" : "opacity-100"}`}
          onClick={closeChatOverlay}
          aria-modal
          role="dialog"
          aria-label="AI Assistant (enlarged)"
        >
          <div
            className={`w-full md:max-w-2xl h-[90dvh] md:h-[85vh] flex flex-col bg-background rounded-t-2xl md:rounded-xl overflow-hidden shadow-xl transition-transform duration-300 ease-out ${
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
              <InputBlock
                disabled={messages.some((msg) =>
                  msg.content.toLowerCase().includes("contact form")
                )}
                inputValue={inputValue}
                setInputValue={setInputValue}
                handleSendMessage={handleSendMessage}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
