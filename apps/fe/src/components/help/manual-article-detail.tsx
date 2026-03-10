import type { ManualArticle } from "@/services/manual/manual-service";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Separator } from "@dashboard/ui/components/separator";
import { ArrowLeft } from "lucide-react";
import { Button } from "@dashboard/ui/components/button";

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
            <h2 className="text-2xl font-bold text-gray-900">
              {article.title}
            </h2>
            <Badge variant="outline">{article.category.name}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">{article.summary}</p>
        </div>
      </div>

      <div className="space-y-4">
        {article.steps.map((step, index) => (
          <Card key={step.id} className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <CardTitle className="text-blue-900">
                Step {index + 1}
                {step.title ? `: ${step.title}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {step.content}
              </p>
              {step.imageUrl && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={step.imageUrl}
                    alt={step.title ?? `Step ${index + 1}`}
                    className="w-full object-contain"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {article.createdByUser && (
        <>
          <Separator />
          <p className="text-xs text-gray-500">
            Written by {article.createdByUser.name}
          </p>
        </>
      )}
    </div>
  );
}
