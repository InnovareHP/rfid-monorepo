import {
  KNOWLEDGE_BASE_ICON_MAP,
  KNOWLEDGE_BASE_ITEMS,
  KNOWLEDGE_BASE_SECTION_TITLE,
  RESOURCE_LINKS,
  RESOURCE_LINKS_SECTION_TITLE,
  SEARCH_PLACEHOLDER,
} from "@dashboard/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Input } from "@dashboard/ui/components/input";
import { Search } from "lucide-react";
import { lazy, Suspense } from "react";

const SupportChat = lazy(() =>
  import("../SupportChat/SupportChat").then((m) => ({ default: m.SupportChat }))
);

export function SupportPortalPage() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 pb-24 lg:pb-6 max-w-[1920px] w-full mx-auto lg:items-stretch">
      {/* Left column */}
      <div className="flex-1 min-w-0 space-y-6 sm:space-y-8 order-1">
        <div className="relative flex items-center">
          <Input
            placeholder={SEARCH_PLACEHOLDER}
            className="pl-4 pr-10 h-11 rounded-lg bg-background border border-border"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        </div>

        <section>
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-5 tracking-tight">
            {KNOWLEDGE_BASE_SECTION_TITLE}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {KNOWLEDGE_BASE_ITEMS.map((item) => {
              const Icon = KNOWLEDGE_BASE_ICON_MAP[item.iconKey];
              return (
                <Card
                  key={item.title}
                  className="cursor-pointer transition-shadow hover:shadow-md border border-border rounded-lg overflow-hidden bg-white shadow-sm p-4 gap-3 *:data-[slot=card-header]:p-0 *:data-[slot=card-content]:p-0"
                >
                  <CardHeader className="pb-1">
                    <div
                      className={`size-8 rounded-lg flex items-center justify-center mb-2 ${item.iconBg}`}
                    >
                      <Icon className="size-4 text-white" />
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
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-5 tracking-tight">
            {RESOURCE_LINKS_SECTION_TITLE}
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

      {/* Right column - AI Assistant (desktop sidebar + mobile bar + overlay) */}
      <Suspense
        fallback={
          <div className="hidden lg:block w-full max-w-[380px] shrink-0 min-h-[400px] rounded-xl border border-border bg-muted/30 animate-pulse" />
        }
      >
        <SupportChat />
      </Suspense>
    </div>
  );
}
