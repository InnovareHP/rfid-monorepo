import type { MarketingForm } from "@/services/marketing/form-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Copy, ExternalLink, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

type FormListTableProps = {
  forms: MarketingForm[];
  onEdit: (form: MarketingForm) => void;
  onPublish: (form: MarketingForm) => void;
  onDelete: (form: MarketingForm) => void;
};

export const FormListTable = ({
  forms,
  onEdit,
  onPublish,
  onDelete,
}: FormListTableProps) => {
  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`);
    toast.success("Link copied");
  };

  if (forms.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        No forms yet. Create one to start capturing leads.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white divide-y divide-gray-100">
      {forms.map((form) => (
        <div
          key={form.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {form.name}
              </span>
              <Badge variant={form.status === "PUBLISHED" ? "default" : "outline"}>
                {form.status}
              </Badge>
            </div>
            {form.status === "PUBLISHED" && (
              <button
                type="button"
                onClick={() => copyLink(form.slug)}
                className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <ExternalLink className="h-3 w-3" />
                {`${window.location.origin}/f/${form.slug}`}
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {form.status === "DRAFT" && (
              <Button variant="outline" size="sm" onClick={() => onPublish(form)}>
                <Send className="h-4 w-4 mr-1" />
                Publish
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(form)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(form)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
