import { getPublishedArticleBySlug } from "@/services/manual/manual-service";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function ArticlePage() {
  const { lang, slug } = useParams({
    from: "/_lang/$lang/manual/article/$slug/",
  });

  const { data: article, isLoading } = useQuery({
    queryKey: ["manual-article", slug],
    queryFn: () => getPublishedArticleBySlug(slug),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          That article is no longer available.
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <Link
        to="/$lang/manual/$categorySlug"
        params={{ lang, categorySlug: article.category?.slug ?? "" }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {article.category?.name ?? "Back"}
      </Link>

      <header className="space-y-2">
        <h1 className="page-title text-2xl font-bold tracking-tight">
          {article.title}
        </h1>

        <p className="text-sm text-muted-foreground">{article.summary}</p>

        <p className="text-xs text-muted-foreground">
          {article.readMinutes} min read
        </p>
      </header>

      <ol className="space-y-6">
        {article.steps?.map((step, index) => (
          <li
            key={step.id ?? index}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step {index + 1}
            </p>

            {step.title && (
              <h2 className="mb-2 text-base font-semibold text-foreground">
                {step.title}
              </h2>
            )}

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {step.content}
            </p>

            {step.imageUrl && (
              <img
                src={step.imageUrl}
                alt=""
                loading="lazy"
                className="mt-3 max-w-full rounded-md border border-border"
              />
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}
