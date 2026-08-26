import { getPublishedCategoryBySlug } from "@/services/manual/manual-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { ArticleList } from "./ArticleList";

export function CategoryPage() {
  const { lang, categorySlug } = useParams({
    from: "/_lang/$lang/manual/$categorySlug/",
  });

  const { data: category, isLoading } = useQuery({
    queryKey: ["manual-category", categorySlug],
    queryFn: () => getPublishedCategoryBySlug(categorySlug),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <Link
        to="/$lang/manual"
        params={{ lang }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        All topics
      </Link>

      {isLoading ? (
        <Skeleton className="h-8 w-64" />
      ) : (
        <div className="space-y-1">
          <h1 className="page-title text-2xl font-bold tracking-tight">
            {category?.name ?? "Not found"}
          </h1>

          {category?.description && (
            <p className="text-sm text-muted-foreground">
              {category.description}
            </p>
          )}
        </div>
      )}

      {category && <ArticleList lang={lang} categoryId={category.id} />}
    </div>
  );
}
