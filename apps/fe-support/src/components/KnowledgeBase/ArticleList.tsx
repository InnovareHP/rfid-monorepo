import { getPublishedArticles } from "@/services/manual/manual-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ManualCard } from "./ManualCard";

export function ArticleList({
  lang,
  categoryId,
}: {
  lang: string;
  categoryId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["manual-articles", categoryId],
    queryFn: () => getPublishedArticles({ categoryId, limit: 50 }),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.articles.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing published in this section yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {data.articles.map((article) => (
        <ManualCard
          key={article.id}
          to="/$lang/manual/article/$slug"
          params={{ lang, slug: article.slug }}
          title={article.title}
          description={article.summary}
          meta={
            <p className="text-xs text-muted-foreground">
              {article.readMinutes} min read
            </p>
          }
        />
      ))}
    </div>
  );
}
