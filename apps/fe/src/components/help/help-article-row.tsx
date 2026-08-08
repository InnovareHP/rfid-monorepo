import type { ManualArticle } from "@/services/manual/manual-service";
import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { memo } from "react";

export const HelpArticleRow = memo(function HelpArticleRow({
  team,
  article,
}: {
  team: string;
  article: ManualArticle;
}) {
  return (
    <Link
      to="/$team/help/$categorySlug/$articleSlug"
      params={{
        team,
        categorySlug: article.category.slug,
        articleSlug: article.slug,
      }}
      className="flex items-start gap-4 border-b border-border px-6 py-4 transition-colors hover:bg-muted"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-table-header">
        <FileText className="size-5 text-primary" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">
          {article.title}
        </span>
        <span className="block text-sm text-muted-foreground">
          {article.summary}
        </span>
        <span className="block pt-1 text-xs text-muted-foreground">
          {article.readMinutes} min read
        </span>
      </span>
    </Link>
  );
});
