import { CategoryGrid } from "@/components/KnowledgeBase/CategoryGrid";
import { FeaturedArticles } from "@/components/KnowledgeBase/FeaturedArticles";
import { ManualSearch } from "@/components/KnowledgeBase/ManualSearch";
import { ManualSection } from "@/components/KnowledgeBase/ManualSection";
import { KNOWLEDGE_BASE_SECTION_TITLE } from "@dashboard/shared";
import { useParams } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const SupportChat = lazy(() =>
  import("../SupportChat/SupportChat").then((m) => ({ default: m.SupportChat }))
);

const CHAT_COLUMN_WIDTH = "500px";

export function SupportPortalPage() {
  const { lang } = useParams({ from: "/_lang/$lang/" });

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-6 p-4 pb-24 sm:p-6 lg:flex-row lg:items-stretch lg:pb-6">
      <div className="order-1 min-w-0 flex-1 space-y-6 sm:space-y-8">
        <ManualSearch lang={lang} />

        <ManualSection title="Popular articles">
          <FeaturedArticles lang={lang} />
        </ManualSection>

        <ManualSection title={KNOWLEDGE_BASE_SECTION_TITLE}>
          <CategoryGrid lang={lang} />
        </ManualSection>
      </div>

      {/* On lg this takes a fixed width so the left column cannot shift; on
          mobile it takes no space and SupportChat renders its own bottom bar. */}
      <div
        className="order-2 w-0 min-w-0 shrink-0 overflow-visible lg:w-full"
        style={{ maxWidth: CHAT_COLUMN_WIDTH }}
      >
        <Suspense
          fallback={
            <div className="hidden min-h-[400px] w-full animate-pulse rounded-xl border border-border bg-muted/30 lg:block" />
          }
        >
          <SupportChat />
        </Suspense>
      </div>
    </div>
  );
}
