import { Button } from "./button";
import { Card } from "./card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Label } from "./label";
import { useRef, useState } from "react";

type ReceiptImagePickerProps = {
  onSelect: (file: File) => void;
  label?: string;
};

export function ReceiptImagePicker({
  onSelect,
  label = "Upload Receipt",
}: ReceiptImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = (file?: File) => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    onSelect(file);
    setIsOpen(false);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Trigger */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="w-full">
            Upload Image
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Image Source</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {/* Camera */}
            <Button onClick={() => cameraInputRef.current?.click()}>
              📷 Use Camera
            </Button>

            {/* Upload */}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload from Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />

      {/* Preview */}
      {preview && (
        <Card className="p-3">
          <img
            src={preview}
            alt="Receipt preview"
            className="max-h-64 w-full rounded-md object-contain"
          />
        </Card>
      )}
    </div>
  );
}
