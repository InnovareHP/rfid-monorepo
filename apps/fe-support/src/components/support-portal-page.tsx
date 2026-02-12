import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { Input } from "@dashboard/ui/components/input";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Brain,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Mail,
  Maximize2,
  Menu,
  MessageCircle,
  Mic2,
  Minimize2,
  Package,
  Play,
  Puzzle,
  RefreshCw,
  Search,
  Send,
  Settings,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const AI_WELCOME_MESSAGE =
  "Hello! I'm your AI assistant. I know a lot about Innovare HP RFID and I can do much more than chatbots you've seen before. How can I help? Tell me as much as you can about your question.";

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

const KNOWLEDGE_BASE_ITEMS = [
  {
    icon: Play,
    iconBg: "bg-red-500",
    titleColor: "text-red-600",
    title: "Getting started",
    description:
      "Everything you need to know to get started with Innovare HP RFID.",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-amber-500",
    titleColor: "text-amber-600",
    title: "Conversations",
    description:
      "Master RFID systems, readers, and software through Innovare HP RFID documentation and guides.",
  },
  {
    icon: Settings,
    iconBg: "bg-teal-500",
    titleColor: "text-teal-600",
    title: "Admin activities",
    description:
      "Manage users, settings, devices, and boost productivity with Innovare HP RFID analytics.",
  },
  {
    icon: Mic2,
    iconBg: "bg-pink-500",
    titleColor: "text-pink-600",
    title: "Audio, call quality, & network",
    description:
      "Maximize call quality with setup guides and troubleshooting tips.",
  },
  {
    icon: Brain,
    iconBg: "bg-blue-600",
    titleColor: "text-blue-600",
    title: "Innovare HP RFID AI features",
    description:
      "Take advantage of AI-assisted support and troubleshooting for Innovare HP RFID.",
  },
  {
    icon: CreditCard,
    iconBg: "bg-amber-500",
    titleColor: "text-amber-600",
    title: "Billing & subscription",
    description:
      "Manage payments, invoices, taxes, and subscriptions with ease.",
  },
  {
    icon: Puzzle,
    iconBg: "bg-purple-500",
    titleColor: "text-purple-600",
    title: "Integrations",
    description:
      "Make the most of Innovare HP RFID integrations with your systems and tools.",
  },
  {
    icon: Package,
    iconBg: "bg-blue-500",
    titleColor: "text-blue-600",
    title: "Product updates",
    description: "Stay up to date on new features, improvements, and changes.",
  },
];

const RESOURCE_LINKS = [
  {
    title: "Innovare HP RFID Learning",
    description:
      "Courses, videos, and learning paths designed to help you master Innovare HP RFID",
  },
  {
    title: "Innovare HP RFID Webinars & Events",
    description:
      "Discover upcoming Innovare HP RFID webinars and events and watch on-demand sessions",
  },
  {
    title: "Developers",
    description:
      "Use our API references and tutorials to build solutions fitting your needs",
  },
  {
    title: "Integrations",
    description:
      "Extend Innovare HP RFID with integrations and third-party solutions",
  },
];

const FOOTER_LINKS = [
  "Feedback",
  "Privacy",
  "Terms of use",
  "Security",
  "DPA",
  "AI Disclaimer",
];

type ChatMessage = { role: "user" | "assistant"; content: string };

export function SupportPortalPage() {
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
      { role: "assistant", content: "Thinking..." },
    ]);
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
    <div className="min-h-screen flex flex-col bg-muted/30 overflow-x-hidden">
      <header
        className="text-white shrink-0"
        style={{ backgroundColor: "#004aad" }}
      >
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 max-w-[1600px] mx-auto gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              to="/"
              className="block shrink-0 cursor-pointer rounded transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#004aad]"
              aria-label="Go to home"
            >
              <img
                src="/images/navbar-logo.png"
                alt="Dashboard logo"
                className="h-[60px] w-auto object-contain"
              />
            </Link>
            <div className="h-6 w-px bg-white/50 shrink-0" aria-hidden />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-white hover:bg-white/10 hover:text-white gap-1 shrink-0"
                >
                  EN
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem>Español</DropdownMenuItem>
                <DropdownMenuItem>Français</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer text-white hover:bg-white/10 hover:text-white"
            >
              Status
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer text-white hover:bg-white/10 hover:text-white"
            >
              Contact Us
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-white hover:bg-white/10 hover:text-white gap-1"
                >
                  <User className="size-4" />
                  User name
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Account</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          {/* Mobile nav */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer md:hidden text-white hover:bg-white/10 hover:text-white shrink-0"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Activity className="size-4 mr-2" />
                Status
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="size-4 mr-2" />
                Contact Us
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="size-4 mr-2" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 pb-24 lg:pb-6 max-w-[1600px] w-full mx-auto lg:items-stretch">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6 sm:space-y-8 order-1">
          <div className="relative flex items-center">
            <Input
              placeholder="Search for articles"
              className="pl-4 pr-10 h-11 rounded-lg bg-background border border-border"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          </div>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-5 tracking-tight">
              Browse our knowledge base
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {KNOWLEDGE_BASE_ITEMS.map((item) => (
                <Card
                  key={item.title}
                  className="cursor-pointer transition-shadow hover:shadow-md border border-border rounded-lg overflow-hidden bg-white shadow-sm p-4 gap-3 *:data-[slot=card-header]:p-0 *:data-[slot=card-content]:p-0"
                >
                  <CardHeader className="pb-1">
                    <div
                      className={`size-8 rounded-lg flex items-center justify-center mb-2 ${item.iconBg}`}
                    >
                      <item.icon className="size-4 text-white" />
                    </div>
                    <CardTitle
                      className={`text-sm font-bold leading-tight ${item.titleColor}`}
                    >
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-[#545B6C] leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-5 tracking-tight">
              Resource Links
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {RESOURCE_LINKS.map((item) => (
                <Card
                  key={item.title}
                  className="cursor-pointer transition-shadow hover:shadow-md border border-border rounded-lg overflow-hidden bg-white shadow-sm p-4 gap-3 *:data-[slot=card-header]:p-0 *:data-[slot=card-content]:p-0"
                >
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-bold text-foreground leading-tight">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-[#545B6C] leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Right column - AI Assistant (desktop only; on mobile use bottom bar + slide-up) */}
        <aside
          className={`hidden lg:flex flex-col min-h-0 w-full lg:max-w-[380px] shrink-0 order-2 transition-opacity duration-300 ${isChatEnlarged ? "pointer-events-none opacity-0" : ""}`}
        >
          <Card className="border rounded-xl overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 lg:flex-1">
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
              className="flex-1 overflow-auto p-4 min-h-0 space-y-4"
            >
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
                      {msg.content === "Thinking..." ? (
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
            </div>
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
          </Card>
        </aside>
      </div>

      <button
        type="button"
        onClick={openChatOverlay}
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex items-center justify-between gap-3 px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)] rounded-t-xl active:bg-muted/50 transition-colors"
        aria-label="Open AI Assistant chat"
      >
        <span className="font-semibold text-[15px] text-foreground">
          Innovare HP RFID AI Assistant
        </span>
        <ChevronUp
          className="size-5 text-muted-foreground shrink-0"
          aria-hidden
        />
      </button>

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
                        <p className="text-sm leading-relaxed text-foreground">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
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
            </Card>
          </div>
        </div>
      )}

      <footer className="border-t bg-background py-4 px-4 sm:py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 max-w-[1600px] mx-auto text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
          <span>© Copyright Support</span>
          <nav className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 sm:gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((label) => (
              <Button
                key={label}
                variant="link"
                className="cursor-pointer text-muted-foreground h-auto p-0 text-sm font-normal"
              >
                {label}
              </Button>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
