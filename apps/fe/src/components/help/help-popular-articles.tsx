import type { ManualFeaturedArticle } from "@/services/manual/manual-service";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export function HelpPopularArticles({
  team,
  articles,
}: {
  team: string;
  articles: ManualFeaturedArticle[];
}) {
  if (!articles.length) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-center font-display text-2xl font-semibold text-primary sm:text-3xl">
        Popular Articles
      </h2>
      <Card>
        <CardContent className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              to="/$team/help/$categorySlug/$articleSlug"
              params={{
                team,
                categorySlug: article.category.slug,
                articleSlug: article.slug,
              }}
              className="flex items-start gap-2 text-sm font-medium text-primary hover:underline"
            >
              <FileText className="mt-0.5 size-4 shrink-0" />
              {article.title}
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
