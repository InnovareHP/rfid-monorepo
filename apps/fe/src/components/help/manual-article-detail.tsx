import type { ManualArticle } from "@/services/manual/manual-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { ArrowLeft } from "lucide-react";

export function ManualArticleDetail({
  article,
  onBack,
}: {
  article: ManualArticle;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">
              {article.title}
            </h2>
            <Badge variant="outline">{article.category.name}</Badge>
            <span className="text-xs text-muted-foreground">
              {article.readMinutes} min read
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {article.summary}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {article.steps.map((step, index) => (
          <Card key={step.id} className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-table-header">
              <CardTitle className="text-foreground">
                Step {index + 1}
                {step.title ? `: ${step.title}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {step.content}
              </p>
              {step.imageUrl && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={step.imageUrl}
                    alt={step.title ?? `Step ${index + 1}`}
                    className="w-full object-contain"
                    decoding="async"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
