import {
  getCategories,
  getFeaturedArticles,
  getPublishedArticles,
} from "@/services/manual/manual-service";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HelpArticleRow } from "./help-article-row";
import { HelpCategoryCard } from "./help-category-card";
import { HelpContactSupport } from "./help-contact-support";
import { HelpHero } from "./help-hero";
import { HelpPopularArticles } from "./help-popular-articles";

const SEARCH_LIMIT = 20;

export function HelpCenterPage({ team }: { team: string }) {
  const [search, setSearch] = useState("");
  const searchTerm = search.trim();

  const categoriesQuery = useQuery({
    queryKey: ["manual-categories"],
    queryFn: getCategories,
  });

  const featuredQuery = useQuery({
    queryKey: ["manual-featured-articles"],
    queryFn: () => getFeaturedArticles(9),
  });

  const searchQuery = useQuery({
    queryKey: ["manual-search", searchTerm],
    queryFn: () => getPublishedArticles(undefined, SEARCH_LIMIT, 1, searchTerm),
    enabled: searchTerm.length > 1,
  });

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="page-style ">
      <HelpHero
        team={team}
        search={search}
        onSearchChange={setSearch}
        topics={categories.slice(0, 4)}
      />

      {searchTerm.length > 1 ? (
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            {searchQuery.isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Searching...</p>
            ) : !searchQuery.data?.articles.length ? (
              <p className="p-6 text-sm text-muted-foreground">
                No guides match "{searchTerm}".
              </p>
            ) : (
              searchQuery.data.articles.map((article) => (
                <HelpArticleRow
                  key={article.id}
                  team={team}
                  article={article}
                />
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-6">
            <h2 className="text-center font-display text-2xl font-semibold text-primary sm:text-3xl">
              Browse by Category
            </h2>
            {categoriesQuery.isLoading ? (
              <p className="text-center text-sm text-muted-foreground">
                Loading categories...
              </p>
            ) : !categories.length ? (
              <p className="text-center text-sm text-muted-foreground">
                No categories available yet.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <HelpCategoryCard
                    key={category.id}
                    team={team}
                    category={category}
                  />
                ))}
              </div>
            )}
          </section>

          <HelpPopularArticles
            team={team}
            articles={featuredQuery.data ?? []}
          />
        </>
      )}

      <HelpContactSupport />
    </div>
  );
}
