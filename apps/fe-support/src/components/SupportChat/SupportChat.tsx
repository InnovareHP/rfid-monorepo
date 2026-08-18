import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { InputBlock } from "./InputBlock";

export function SupportChat() {
  const [isChatEnlarged, setIsChatEnlarged] = useState(false);
  const [isOverlayClosing, setIsOverlayClosing] = useState(false);
  const [isOverlayOpening, setIsOverlayOpening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const overlayChatScrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    hasOpenForm,
    isStreaming,
    send,
    reset,
    openAssistanceForm,
    openFormOnMessage,
    markFormSubmitted,
  } = useAssistantChat();

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
    if (!text || hasOpenForm || isStreaming) return;
    setInputValue("");
    void send(text);
  };

  const resetChat = () => {
    setInputValue("");
    reset();
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

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col min-h-0 w-full lg:max-w-[500px] shrink-0 order-2 transition-opacity duration-300 ${isChatEnlarged ? "pointer-events-none opacity-0" : ""}`}
      >
        <Card className="border rounded-xl overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 lg:flex-1 lg:max-h-[calc(100vh-7rem)]">
          <ChatHeader
            mode="inline"
            onToggleSize={openChatOverlay}
            onReset={resetChat}
            resetDisabled={messages.length === 0 || isStreaming}
          />
          <div
            ref={chatScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4 overscroll-behavior-contain"
          >
            <ChatMessageList
              messages={messages}
              onFormSuccess={markFormSubmitted}
              onOpenForm={openFormOnMessage}
            />
          </div>
          <InputBlock
            disabled={hasOpenForm || isStreaming}
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendMessage={handleSendMessage}
            onRequestAssistance={openAssistanceForm}
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
          Refidly AI Assistant
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
              <ChatHeader
                mode="overlay"
                onToggleSize={closeChatOverlay}
                onReset={resetChat}
                resetDisabled={messages.length === 0 || isStreaming}
              />
              <div
                ref={overlayChatScrollRef}
                className="flex-1 overflow-auto p-4 min-h-0 space-y-4"
              >
                <ChatMessageList
                  messages={messages}
                  onFormSuccess={markFormSubmitted}
                  onOpenForm={openFormOnMessage}
                />
              </div>
              <InputBlock
                disabled={hasOpenForm || isStreaming}
                inputValue={inputValue}
                setInputValue={setInputValue}
                handleSendMessage={handleSendMessage}
                onRequestAssistance={openAssistanceForm}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
