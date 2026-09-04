import { boardQueryKey } from "@/lib/helper/board-query-key";
import {
  deleteAttachment,
  getFieldAttachments,
  uploadAttachment,
  type FieldAttachment,
} from "@/services/board/attachment-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "../confirmation-dialog";

const SPREADSHEET_MIME_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const mimeIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (SPREADSHEET_MIME_TYPES.includes(mimeType)) return FileSpreadsheet;
  return Paperclip;
};

type AttachmentCellProps = {
  recordId: string;
  fieldId: string;
  fieldName: string;
  attachmentCount: number;
  moduleType: string;
};

export const AttachmentCell = memo(function AttachmentCell({
  recordId,
  fieldId,
  fieldName,
  attachmentCount,
  moduleType,
}: AttachmentCellProps) {
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<FieldAttachment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const listKey = ["field-attachments", recordId, fieldId];
  const recordsKey = boardQueryKey(moduleType);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => getFieldAttachments(recordId, fieldId),
    enabled: open,
  });

  const bumpCount = (delta: number) => {
    queryClient.setQueriesData(
      { queryKey: recordsKey },
      (old: { data: Record<string, unknown>[] } | undefined) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  [fieldName]: String(
                    Math.max(0, Number(r[fieldName] ?? "0") + delta)
                  ),
                }
              : r
          ),
        };
      }
    );
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadAttachment(recordId, fieldId, file, moduleType),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: recordsKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousBoard = queryClient.getQueriesData({
        queryKey: recordsKey,
      });
      bumpCount(1);
      return { previousList, previousBoard };
    },
    onError: (_err, _file, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      context?.previousBoard?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      toast.error("Failed to upload attachment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: recordsKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      deleteAttachment(attachmentId, moduleType),
    onMutate: async (attachmentId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: recordsKey });
      const previousList = queryClient.getQueryData(listKey);
      const previousBoard = queryClient.getQueriesData({
        queryKey: recordsKey,
      });
      queryClient.setQueryData(listKey, (old: FieldAttachment[] = []) =>
        old.filter((a) => a.id !== attachmentId)
      );
      bumpCount(-1);
      return { previousList, previousBoard };
    },
    onError: (_err, _id, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      context?.previousBoard?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      toast.error("Failed to remove attachment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: recordsKey });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be 20MB or smaller");
      return;
    }
    uploadMutation.mutate(file);
  };

  const previewable =
    previewAttachment &&
    (previewAttachment.mimeType.startsWith("image/") ||
      previewAttachment.mimeType === "application/pdf");

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
          >
            <Paperclip className="size-3.5 text-muted-foreground" />
            {attachmentCount > 0
              ? `${attachmentCount} file${attachmentCount === 1 ? "" : "s"}`
              : "Add file"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-2" align="start">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Attachments
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={uploadMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Spinner size="sm" className="size-3.5" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : attachments.length === 0 ? (
            <p className="px-1 py-3 text-center text-xs text-muted-foreground">
              No files uploaded yet.
            </p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {attachments.map((attachment) => {
                const Icon = mimeIcon(attachment.mimeType);
                const isImage = attachment.mimeType.startsWith("image/");
                const isPreviewable =
                  isImage || attachment.mimeType === "application/pdf";

                return (
                  <div
                    key={attachment.id}
                    className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted"
                  >
                    {isImage ? (
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(attachment)}
                        className="shrink-0"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.fileName}
                          className="h-8 w-8 rounded object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ) : (
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                    )}

                    <button
                      type="button"
                      disabled={!isPreviewable}
                      onClick={() =>
                        isPreviewable && setPreviewAttachment(attachment)
                      }
                      className="min-w-0 flex-1 truncate text-left text-sm text-foreground disabled:cursor-default"
                      title={attachment.fileName}
                    >
                      {attachment.fileName}
                    </button>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatFileSize(attachment.fileSize)}
                    </span>

                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      Download
                    </a>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remove attachment"
                      onClick={() => setDeletingId(attachment.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Dialog
        open={Boolean(previewAttachment)}
        onOpenChange={(next) => !next && setPreviewAttachment(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.fileName}</DialogTitle>
          </DialogHeader>
          {previewable && previewAttachment?.mimeType.startsWith("image/") ? (
            <img
              src={previewAttachment.url}
              alt={previewAttachment.fileName}
              className="max-h-[60dvh] w-full rounded-md object-contain"
              decoding="async"
            />
          ) : previewable ? (
            <iframe
              src={previewAttachment?.url}
              className="h-[60dvh] w-full rounded-md border border-border"
              title={previewAttachment?.fileName}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(deletingId)}
        onOpenChange={(next) => !next && setDeletingId(null)}
        title="Remove attachment?"
        description="The file will be permanently removed from this record."
        confirmText="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deletingId) deleteMutation.mutate(deletingId);
          setDeletingId(null);
        }}
      />
    </>
  );
});
