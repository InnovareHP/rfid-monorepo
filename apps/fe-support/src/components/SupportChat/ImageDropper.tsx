import { ImagePlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ImageDropperProps = {
  value: File[];
  onChange: (files: File[]) => void;
  max?: number;
};

export function ImageDropper({ value, onChange, max = 5 }: ImageDropperProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => value.map((file) => URL.createObjectURL(file)),
    [value]
  );

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = max - value.length;
      if (remaining <= 0) return;

      const accepted = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining);

      if (accepted.length > 0) {
        onChange([...value, ...accepted]);
      }
    },
    [value, onChange, max]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div
              key={i}
              className="relative group size-16 rounded-lg overflow-hidden border border-border"
            >
              <img
                src={src}
                alt={`Upload ${i + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <X className="size-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus
            className={`size-5 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
          />
          <p className="text-xs text-muted-foreground text-center">
            Drop images here or click to browse
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            {value.length}/{max} images
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) processFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
