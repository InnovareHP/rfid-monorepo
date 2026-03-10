import {
  deleteArticle,
  deleteCategory,
  getArticles,
  getCategories,
  updateArticle,
  type ManualArticle,
  type ManualCategory,
} from "@/services/manual/manual-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@dashboard/ui/components/pagination";
import { Separator } from "@dashboard/ui/components/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Edit2,
  Eye,
  EyeOff,
  FolderPlus,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryDialog } from "./CategoryDialog";
import { ManualArticleForm } from "./ManualArticleForm";

export function ManualManagementPage() {
  const queryClient = useQueryClient();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ManualCategory | null>(
    null
  );
  const [articleFormOpen, setArticleFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ManualArticle | null>(
    null
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [articleFilterMeta, setArticleFilterMeta] = useState({
    page: 1,
    limit: 10,
  });

  const categoriesQuery = useQuery({
    queryKey: ["manual-categories"],
    queryFn: getCategories,
  });

  const articlesQuery = useQuery({
    queryKey: ["manual-articles", categoryFilter, articleFilterMeta],
    queryFn: () =>
      getArticles(
        categoryFilter || undefined,
        articleFilterMeta.limit,
        articleFilterMeta.page
      ),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-categories"] });
      queryClient.invalidateQueries({ queryKey: ["manual-articles"] });
      toast.success("Category deleted");
    },
    onError: () => toast.error("Failed to delete category"),
  });

  const deleteArticleMutation = useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-articles"] });
      toast.success("Article deleted");
    },
    onError: () => toast.error("Failed to delete article"),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      updateArticle(id, { published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-articles"] });
      toast.success("Article updated");
    },
    onError: () => toast.error("Failed to update article"),
  });

  const totalPages = Math.ceil(
    (articlesQuery.data?.total ?? 0) / articleFilterMeta.limit
  );
  const currentPage = articleFilterMeta.page;

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Manual</h1>
          <p className="text-sm text-muted-foreground">
            Manage help articles and categories displayed on the dashboard help
            page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingCategory(null);
              setCategoryDialogOpen(true);
            }}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Category
          </Button>
          <Button
            onClick={() => {
              setEditingArticle(null);
              setArticleFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </Button>
        </div>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Organize articles into categories for the help page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !categoriesQuery.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Create one to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {categoriesQuery.data.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat._count?.articles ?? 0} articles
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteCategoryMutation.mutate(cat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Articles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Articles</CardTitle>
              <CardDescription>
                Step-by-step guides with text and images
              </CardDescription>
            </div>
            {categoriesQuery.data && categoriesQuery.data.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant={categoryFilter === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("")}
                >
                  All
                </Button>
                {categoriesQuery.data.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={categoryFilter === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {articlesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !articlesQuery.data?.total ? (
            <p className="text-sm text-muted-foreground">
              No articles yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {articlesQuery.data.articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{article.title}</p>
                        <Badge
                          variant={article.published ? "default" : "secondary"}
                        >
                          {article.published ? "Published" : "Draft"}
                        </Badge>
                        {article.category && (
                          <Badge variant="outline">
                            {article.category.name}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {article.summary}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {article._count?.steps ?? 0} steps
                        {article.createdByUser &&
                          ` · by ${article.createdByUser.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        togglePublishMutation.mutate({
                          id: article.id,
                          published: !article.published,
                        })
                      }
                      title={article.published ? "Unpublish" : "Publish"}
                    >
                      {article.published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingArticle(article);
                        setArticleFormOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteArticleMutation.mutate(article.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

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
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />

      {articleFormOpen && (
        <ManualArticleForm
          open={articleFormOpen}
          onOpenChange={setArticleFormOpen}
          article={editingArticle}
          categories={categoriesQuery.data ?? []}
        />
      )}
    </div>
  );
}
