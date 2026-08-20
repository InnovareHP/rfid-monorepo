import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import {
  getPublishedArticleBySlug,
  MANUAL_STALE_TIME,
} from "@/services/manual/manual-service";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ManualArticleDetail } from "./manual-article-detail";

export function HelpArticlePage({
  team,
  categorySlug,
  articleSlug,
}: {
  team: string;
  categorySlug: string;
  articleSlug: string;
}) {
  const navigate = useNavigate();

  const articleQuery = useQuery({
    queryKey: ["manual-article", articleSlug],
    queryFn: () => getPublishedArticleBySlug(articleSlug),
    staleTime: MANUAL_STALE_TIME,
    gcTime: MANUAL_STALE_TIME,
  });

  return (
    <div className="page-style">
      {articleQuery.isLoading ? (
        <DetailPageSkeleton blocks={6} />
      ) : !articleQuery.data ? (
        <p className="text-sm text-muted-foreground">Article not found.</p>
      ) : (
        <ManualArticleDetail
          article={articleQuery.data}
          onBack={() =>
            navigate({
              to: "/$team/help/$categorySlug",
              params: { team, categorySlug },
            })
          }
        />
      )}
    </div>
  );
}
