import type { TaskAttachmentDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "../confirmation-dialog";
import { TaskSection } from "./task-section";

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
    <TaskSection title="Attachment/s">
      <Button
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Spinner size="sm" /> : <Upload className="size-4" />}
        Upload
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted"
            >
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-primary hover:underline"
              >
                {attachment.filename}
              </a>
              <span className="text-xs text-muted-foreground">
                {(attachment.sizeBytes / 1024).toFixed(0)} KB
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeletingId(attachment.id)}
                className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                aria-label="Delete attachment"
              >
                <Trash2 className="size-3.5" />
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
    </TaskSection>
  );
};
