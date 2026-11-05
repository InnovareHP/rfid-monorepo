import { uploadImage } from "@/services/image/image-service";
import { Button } from "@dashboard/ui/components/button";
import { Spinner } from "@dashboard/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

type RichTextImageButtonProps = {
  disabled: boolean;
  onInsert: (url: string) => void;
};

// Public upload because mail clients fetch the image without a session.
export const RichTextImageButton = ({
  disabled,
  onInsert,
}: RichTextImageButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => uploadImage(file, "public"),
    onSuccess: (data: { url: string }) => onInsert(data.url),
    onError: () => toast.error("Failed to upload image"),
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || upload.isPending}
        aria-label="Insert image"
        title="Insert image"
        className="size-8"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? <Spinner /> : <ImagePlus className="size-4" />}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate(file);
          event.target.value = "";
        }}
      />
    </>
  );
};
