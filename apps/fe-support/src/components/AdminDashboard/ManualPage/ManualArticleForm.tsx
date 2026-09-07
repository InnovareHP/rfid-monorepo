import {
  getArticleById,
  type ManualArticle,
  type ManualCategory,
} from "@/services/manual/manual-service";
import {
  Dialog,
  DialogContent,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { ManualArticleFormFields } from "./ManualArticleFormFields";

export function ManualArticleForm({
  open,
  onOpenChange,
  article,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ManualArticle | null;
  categories: ManualCategory[];
}) {
  const articleQuery = useQuery({
    queryKey: ["manual-article", article?.id],
    queryFn: () => getArticleById(article!.id),
    enabled: !!article?.id,
  });

  const loaded = article?.id ? (articleQuery.data ?? null) : null;
  const isLoading = Boolean(article?.id) && !loaded;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="shell" className="sm:max-w-3xl">
        <DialogFormHeader
          icon={<BookOpen />}
          title={article ? "Edit Article" : "New Article"}
          description="Create a step-by-step guide with text and images."
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <ManualArticleFormFields
            key={loaded?.id ?? "new"}
            onOpenChange={onOpenChange}
            article={loaded}
            categories={categories}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
