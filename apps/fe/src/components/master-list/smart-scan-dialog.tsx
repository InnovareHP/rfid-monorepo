import {
  createLead,
  scanBusinessCard,
  type ScannedCardResult,
} from "@/services/lead/lead-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, ScanLine, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

type Step = "upload" | "processing" | "review";

const reviewSchema = z.object({
  record_name: z.string().min(1, "Name is required"),
  fields: z.record(z.string(), z.string().optional()),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface SmartScanDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const EDITABLE_FIELD_TYPES = new Set([
  "TEXT",
  "EMAIL",
  "PHONE",
  "LOCATION",
  "NUMBER",
  "PERSON",
]);

export function SmartScanDialog({ open, setOpen }: SmartScanDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScannedCardResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { record_name: "", fields: {} },
  });

  const reset = () => {
    setStep("upload");
    setPreview(null);
    setScanResult(null);
    setIsDragging(false);
    form.reset({ record_name: "", fields: {} });
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    setOpen(isOpen);
  };

  const requestCameraAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      cameraInputRef.current?.click();
    } catch {
      toast.error(
        "Camera access denied. Please allow camera access in your browser settings."
      );
    }
  }, []);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File must be under 5MB");
        return;
      }

      setPreview(URL.createObjectURL(selectedFile));
      setStep("processing");

      try {
        const result = await scanBusinessCard(selectedFile);
        setScanResult(result);

        const initialFields: Record<string, string> = {};
        for (const [fieldId, value] of Object.entries(result.fields)) {
          if (value) initialFields[fieldId] = value;
        }

        form.reset({
          record_name: result.record_name || "",
          fields: initialFields,
        });
        setStep("review");
      } catch {
        toast.error("Failed to scan business card. Please try again.");
        setStep("upload");
        setPreview(null);
      }
    },
    [form]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const onSubmit = async (data: ReviewFormValues) => {
    if (!scanResult) return;

    try {
      // Build initialValues: fieldId → value (only non-empty)
      const initialValues: Record<string, string | null> = {};
      for (const [fieldId, value] of Object.entries(data.fields)) {
        initialValues[fieldId] = value?.trim() || null;
      }

      // Build personContact from Gemini's contactInfo if a PERSON field exists
      let personContact:
        | {
            fieldId: string;
            contactNumber?: string;
            email?: string;
            address?: string;
          }
        | undefined;

      const personCol = scanResult.columns.find(
        (c) => c.field_type === "PERSON"
      );
      if (personCol && data.fields[personCol.id]?.trim()) {
        const { contactInfo } = scanResult;
        personContact = {
          fieldId: personCol.id,
          contactNumber: contactInfo.phone || "",
          email: contactInfo.email || "",
          address: contactInfo.address || "",
        };
      }

      await createLead([{ record_name: data.record_name.trim() }], "LEAD", {
        initialValues,
        personContact,
      });

      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created from business card");
      handleClose(false);
    } catch {
      toast.error("Failed to create lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Smart Scan
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <ImagePlus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop a business card image, or
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <Button variant="outline" onClick={requestCameraAccess}>
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <p className="text-xs text-gray-400 mt-3">
              Supports JPG, PNG, WebP. Max 5MB.
            </p>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-sm text-gray-600">Scanning business card...</p>
            <p className="text-xs text-gray-400 mt-1">
              Extracting contact information
            </p>
          </div>
        )}

        {step === "review" && scanResult && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {preview && (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Business card"
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={reset}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="record_name"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold">
                        Facility *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {scanResult.columns
                  .filter((col) => EDITABLE_FIELD_TYPES.has(col.field_type))
                  .map((col) => (
                    <FormField
                      key={col.id}
                      control={form.control}
                      name={`fields.${col.id}`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold">
                            {col.field_name}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder={col.field_name}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Create Lead
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
