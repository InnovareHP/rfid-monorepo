import { KNOWLEDGE_BASE_SECTION_TITLE } from "@dashboard/shared";
import { useParams } from "@tanstack/react-router";
import { CategoryGrid } from "./CategoryGrid";
import { FeaturedArticles } from "./FeaturedArticles";
import { ManualSearch } from "./ManualSearch";
import { ManualSection } from "./ManualSection";

export function ManualIndexPage() {
  const { lang } = useParams({ from: "/_lang/$lang/manual/" });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6">
      <ManualSearch lang={lang} />

      <ManualSection title="Popular articles">
        <FeaturedArticles lang={lang} />
      </ManualSection>

      <ManualSection title={KNOWLEDGE_BASE_SECTION_TITLE}>
        <CategoryGrid lang={lang} />
      </ManualSection>
    </div>
  );
}
