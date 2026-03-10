import {
  getCategories,
  getPublishedArticles,
  type ManualArticle,
} from "@/services/manual/manual-service";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Input } from "@dashboard/ui/components/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@dashboard/ui/components/pagination";
import { Separator } from "@dashboard/ui/components/separator";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, CircleHelp } from "lucide-react";
import * as React from "react";
import { ManualArticleDetail } from "./manual-article-detail";

export default function HelpPage() {
  const [selectedArticle, setSelectedArticle] =
    React.useState<ManualArticle | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [articleFilterMeta, setArticleFilterMeta] = React.useState({
    limit: 10,
    page: 1,
  });

  const categoriesQuery = useQuery({
    queryKey: ["manual-categories"],
    queryFn: getCategories,
  });

  const articlesQuery = useQuery({
    queryKey: ["manual-published-articles", categoryFilter, articleFilterMeta],
    queryFn: () =>
      getPublishedArticles(
        categoryFilter || undefined,
        articleFilterMeta.limit,
        articleFilterMeta.page
      ),
  });

  const filteredArticles = React.useMemo(() => {
    if (!articlesQuery.data?.articles) return [];
    if (!searchQuery) return articlesQuery.data.articles;
    const q = searchQuery.toLowerCase();
    return articlesQuery.data.articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.name.toLowerCase().includes(q)
    );
  }, [articlesQuery.data?.articles, searchQuery]);

  if (selectedArticle) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-blue-50/20 to-gray-50">
        <div className="sticky top-0 z-40 border-b-2 border-blue-200 bg-white shadow-md">
          <div className="mx-auto max-w-7xl p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg">
                <CircleHelp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Help Center
                </h1>
                <p className="mt-0.5 text-sm text-gray-600">
                  Find answers quickly, troubleshoot issues, and contact
                  support.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl p-6 sm:p-8">
          <ManualArticleDetail
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
          />
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(
    (articlesQuery.data?.total ?? 0) / articleFilterMeta.limit
  );
  const currentPage = articleFilterMeta.page;

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="sticky top-0 z-40 border-b-2 border-blue-200 bg-white shadow-md">
        <div className="mx-auto max-w-7xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg">
              <CircleHelp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Help Center
              </h1>
              <p className="mt-0.5 text-sm text-gray-600">
                Find answers quickly, troubleshoot issues, and contact support.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 p-6 sm:p-8">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">
                Search User Manual
              </CardTitle>
              <CardDescription>
                Search guides for modules you use daily
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Input
                placeholder="Search: master list, referral list, mileage report, team roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={categoryFilter === "" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setCategoryFilter("")}
                >
                  All
                </Badge>
                {categoriesQuery.data?.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={
                      categoryFilter === cat.id ? "default" : "secondary"
                    }
                    className="cursor-pointer"
                    onClick={() =>
                      setCategoryFilter(categoryFilter === cat.id ? "" : cat.id)
                    }
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Manual Articles */}
          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">User Manual</CardTitle>
              <CardDescription>
                Step-by-step guides to help you get the most out of the
                dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {articlesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading guides...
                </p>
              ) : !filteredArticles.length ? (
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No guides match your search."
                    : "No guides available yet."}
                </p>
              ) : (
                filteredArticles.map((article, index) => (
                  <div key={article.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedArticle(article)}
                      className="w-full rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-left transition-colors hover:bg-blue-100/60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <BookOpen className="mt-0.5 h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {article.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {article.summary}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {article.category.name}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {article.steps.length} steps
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                    {index < filteredArticles.length - 1 ? (
                      <Separator className="my-3 bg-transparent" />
                    ) : null}
                  </div>
                ))
              )}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      {currentPage > 1 && (
                        <PaginationPrevious
                          onClick={() =>
                            setArticleFilterMeta({
                              ...articleFilterMeta,
                              page: currentPage - 1,
                            })
                          }
                        />
                      )}
                    </PaginationItem>
                    {Array.from(
                      { length: totalPages },
                      (_, index) => index + 1
                    ).map((page) => (
                      <PaginationItem
                        onClick={() =>
                          setArticleFilterMeta({ ...articleFilterMeta, page })
                        }
                        key={page}
                      >
                        <PaginationLink isActive={page === currentPage}>
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setArticleFilterMeta({
                              ...articleFilterMeta,
                              page: currentPage + 1,
                            })
                          }
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
