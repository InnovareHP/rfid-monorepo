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
import {
  ChevronDown,
  Search,
  Send,
  RefreshCw,
  Maximize2,
  Play,
  MessageCircle,
  Settings,
  Mic2,
  Brain,
  CreditCard,
  Puzzle,
  Package,
  User,
  Menu,
  Activity,
  Mail,
} from "lucide-react";

const KNOWLEDGE_BASE_ITEMS = [
  {
    icon: Play,
    iconColor: "text-orange-500",
    title: "Getting started",
    description:
      "Everything you need to know to get started with Aircall.",
  },
  {
    icon: MessageCircle,
    iconColor: "text-orange-500",
    title: "Conversations",
    description:
      "Master powerful calling and messaging capabilities through Aircall Workspace, apps and extensions.",
  },
  {
    icon: Settings,
    iconColor: "text-green-600",
    title: "Admin activities",
    description:
      "Create and port numbers, manage users & settings, configure Smartflows and boost productivity with Analytics.",
  },
  {
    icon: Mic2,
    iconColor: "text-pink-500",
    title: "Audio, call quality, & network",
    description:
      "Maximize call quality with setup guides and troubleshooting tips.",
  },
  {
    icon: Brain,
    iconColor: "text-blue-500",
    title: "Aircall AI features",
    description:
      "Take advantage of advanced AI features such as AI Voice Agent and AI Assist Pro.",
  },
  {
    icon: CreditCard,
    iconColor: "text-yellow-600",
    title: "Billing & subscription",
    description:
      "Manage payments, invoices, taxes, and subscriptions with ease.",
  },
  {
    icon: Puzzle,
    iconColor: "text-purple-500",
    title: "Integrations",
    description:
      "Make the most of 100+ pre-built integrations with your favorite tools.",
  },
  {
    icon: Package,
    iconColor: "text-blue-500",
    title: "Product updates",
    description:
      "Stay up to date on new features, improvements, and changes.",
  },
];

const RESOURCE_LINKS = [
  {
    title: "Aircall Learning Lab",
    description:
      "Courses, videos, and learning paths designed to help you master Aircall",
  },
  {
    title: "Aircall Webinars & Events",
    description:
      "Discover upcoming Aircall Webinars & Events and watch on-demand webinars",
  },
  {
    title: "Developers",
    description:
      "Use our API references and tutorials to build solutions fitting your needs",
  },
  {
    title: "App marketplace",
    description:
      "Supercharge Aircall products through our 100+ integrations",
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

export function SupportPortalPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30 overflow-x-hidden">
      {/* Header */}
      <header className="text-white shrink-0" style={{ backgroundColor: "#004aad" }}>
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 max-w-[1600px] mx-auto gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <img
              src="/images/tarsier-white.png"
              alt="Support logo"
              className="h-8 w-auto object-contain"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 hover:text-white gap-1 shrink-0"
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
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Status
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Contact Us
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 hover:text-white gap-1"
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
                className="md:hidden text-white hover:bg-white/10 hover:text-white shrink-0"
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

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
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
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
              Browse our knowledge base
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {KNOWLEDGE_BASE_ITEMS.map((item) => (
                <Card
                  key={item.title}
                  className="cursor-pointer transition-shadow hover:shadow-md border rounded-xl overflow-hidden"
                >
                  <CardHeader className="pb-2">
                    <div
                      className={`size-9 sm:size-10 rounded-lg flex items-center justify-center bg-muted mb-2 ${item.iconColor}`}
                    >
                      <item.icon className="size-5" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Resource Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {RESOURCE_LINKS.map((item) => (
                <Card
                  key={item.title}
                  className="cursor-pointer transition-shadow hover:shadow-md border rounded-xl overflow-hidden"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Right column - AI Assistant */}
        <aside className="w-full lg:max-w-[380px] lg:shrink-0 order-2">
          <Card className="border rounded-xl overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 lg:h-[min(600px,calc(100vh-8rem))]">
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b shrink-0">
              <span className="font-semibold text-sm sm:text-base">AI Assistant</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8 shrink-0">
                  <RefreshCw className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8">
                  <Maximize2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
              <div className="rounded-lg bg-muted/50 p-4 border">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  AI Assistant
                </p>
                <p className="text-sm leading-relaxed">
                  Hello! I'm your AI assistant. I know a lot about Aircall and I
                  can do much more than chatbots you've seen before. How can I
                  help? Tell me as much as you can about your question.
                </p>
              </div>
            </div>
            <div className="p-3 sm:p-4 border-t space-y-2">
              <div className="flex gap-2 min-w-0">
                <Input
                  placeholder="Ask assistant anything..."
                  className="rounded-lg flex-1 min-w-0 text-base sm:text-sm"
                />
                <Button size="icon" className="shrink-0 rounded-lg size-9 sm:size-9">
                  <Send className="size-4" />
                </Button>
              </div>
              <Button
                variant="link"
                className="text-xs h-auto p-0 text-muted-foreground"
              >
                Get your own AI Chat with Aircall
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background py-3 px-4 sm:py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2 max-w-[1600px] mx-auto text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
          <span>© Copyright Support</span>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 sm:gap-x-4 gap-y-1">
            {FOOTER_LINKS.map((label) => (
              <Button
                key={label}
                variant="link"
                className="text-muted-foreground h-auto p-0 text-sm font-normal"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
