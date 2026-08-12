import { uploadImage } from "@/services/image/image-service";
import { Button } from "@dashboard/ui/components/button";
import { useRef } from "react";
import { toast } from "sonner";

type BlastUploadButtonProps = {
  onUploaded: (url: string) => void;
};

export const BlastUploadButton = ({ onUploaded }: BlastUploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const result = await uploadImage(file, "public");
      onUploaded(result.secure_url);
    } catch {
      toast.error("Failed to upload image");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
      >
        Choose File
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
};
