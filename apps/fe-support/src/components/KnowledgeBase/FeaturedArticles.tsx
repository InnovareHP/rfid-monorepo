import { getFeaturedArticles } from "@/services/manual/manual-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ManualCard } from "./ManualCard";

export function FeaturedArticles({ lang }: { lang: string }) {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["manual-featured"],
    queryFn: () => getFeaturedArticles(6),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!articles?.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {articles.map((article) => (
        <ManualCard
          key={article.id}
          to="/$lang/manual/article/$slug"
          params={{ lang, slug: article.slug }}
          title={article.title}
          description={article.summary}
          meta={
            <p className="text-xs text-muted-foreground">
              {article.category?.name} · {article.readMinutes} min read
            </p>
          }
        />
      ))}
    </div>
  );
}
