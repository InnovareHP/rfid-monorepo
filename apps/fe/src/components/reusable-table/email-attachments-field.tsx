import { uploadImage } from "@/services/image/image-service";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const emailAttachmentsSchema = z
  .array(z.object({ key: z.string(), name: z.string() }))
  .max(5, "Up to 5 attachments");

export type EmailAttachment = z.infer<typeof emailAttachmentsSchema>[number];

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf,.png,.jpg,.jpeg,.gif,.webp";

// The S3 key gets a generic name; the real filename (possibly PHI) stays in the encrypted row.
const uploadAttachment = async (file: File): Promise<EmailAttachment> => {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()
    : "bin";
  const renamed = new File([file], `attachment.${extension}`, {
    type: file.type,
  });
  const data = await uploadImage(renamed, "private");
  return { key: data.public_id, name: file.name };
};

type EmailAttachmentsFieldProps = {
  value: EmailAttachment[];
  onChange: (value: EmailAttachment[]) => void;
  disabled?: boolean;
};

export function EmailAttachmentsField({
  value,
  onChange,
  disabled = false,
}: EmailAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (files: File[]) => Promise.all(files.map(uploadAttachment)),
    onSuccess: (added) => onChange([...value, ...added]),
    onError: () => toast.error("Failed to upload attachment"),
  });

  const handleFiles = (files: File[]) => {
    if (value.length + files.length > MAX_FILES) {
      toast.error(`Up to ${MAX_FILES} attachments`);
      return;
    }
    if (files.some((file) => file.size > MAX_BYTES)) {
      toast.error("Each attachment must be 5MB or smaller");
      return;
    }
    upload.mutate(files);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((file) => (
            <li
              key={file.key}
              className="flex items-center gap-1 rounded-md border border-border bg-muted py-1 pl-2 pr-1 text-xs text-foreground"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-48 truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() =>
                  onChange(value.filter((f) => f.key !== file.key))
                }
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || upload.isPending || value.length >= MAX_FILES}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? (
          <Spinner size="sm" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        Attach files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          handleFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
