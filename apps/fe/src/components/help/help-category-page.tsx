import { TablePagination } from "@/components/reusable-table/table-pagination";
import {
  getCategoryBySlug,
  getPublishedArticles,
} from "@/services/manual/manual-service";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { HelpArticleRow } from "./help-article-row";
import { HelpSearchInput } from "./help-search-input";

export function HelpCategoryPage({
  team,
  categorySlug,
}: {
  team: string;
  categorySlug: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searchTerm = search.trim();

  const categoryQuery = useQuery({
    queryKey: ["manual-category", categorySlug],
    queryFn: () => getCategoryBySlug(categorySlug),
  });

  const category = categoryQuery.data;

  const articlesQuery = useQuery({
    queryKey: [
      "manual-category-articles",
      category?.id,
      page,
      pageSize,
      searchTerm,
    ],
    queryFn: () =>
      getPublishedArticles(category!.id, pageSize, page, searchTerm),
    enabled: !!category?.id,
  });

  const total = articlesQuery.data?.total ?? 0;

  return (
    <div className="page-style">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link
            to="/$team/help"
            params={{ team }}
            aria-label="Back to help center"
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            {category?.name ?? "Help Center"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {category?.description}
          </p>
        </div>
      </div>

      <HelpSearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="border-b border-border bg-table-header px-6 py-3 text-sm font-semibold uppercase tracking-wide text-foreground">
            {category?.name}
          </div>

          {articlesQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              Loading articles...
            </p>
          ) : !articlesQuery.data?.articles.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              {searchTerm
                ? `No guides match "${searchTerm}".`
                : "No guides published in this category yet."}
            </p>
          ) : (
            articlesQuery.data.articles.map((article) => (
              <HelpArticleRow key={article.id} team={team} article={article} />
            ))
          )}

          <TablePagination
            currentPage={page}
            totalPages={Math.ceil(total / pageSize)}
            totalCount={total}
            selectedCount={0}
            label={`${total} article(s)`}
            pageSize={pageSize}
            setCurrentPage={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
