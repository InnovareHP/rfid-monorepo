import type { TaskAttachmentDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "../confirmation-dialog";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type AttachmentsSectionProps = {
  attachments: TaskAttachmentDto[];
  uploading?: boolean;
  onUpload: (file: File) => void;
  onDelete: (attachmentId: string) => void;
};

export const AttachmentsSection = ({
  attachments,
  uploading,
  onUpload,
  onDelete,
}: AttachmentsSectionProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("File must be 5MB or smaller");
      return;
    }
    onUpload(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Attachments</h4>
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400">No attachments</p>
      ) : (
        <div className="space-y-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-gray-50"
            >
              <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-primary hover:underline truncate"
              >
                {attachment.filename}
              </a>
              <span className="text-xs text-gray-400">
                {(attachment.sizeBytes / 1024).toFixed(0)} KB
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingId(attachment.id)}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                aria-label="Delete attachment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(deletingId)}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        title="Delete attachment?"
        description="The attachment will be removed from this task."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletingId) onDelete(deletingId);
          setDeletingId(null);
        }}
      />
    </div>
  );
};
