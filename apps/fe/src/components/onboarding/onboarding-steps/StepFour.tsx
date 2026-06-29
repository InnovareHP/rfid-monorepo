import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Avatar, AvatarFallback, AvatarImage } from "@dashboard/ui/components/avatar";
import { Camera, Check, Loader2 } from "lucide-react";
import { useRef } from "react";
import type { UseFormRegister } from "react-hook-form";
import { type FormValues } from "../onboarding";

const PRESET_COLORS = [
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Orange", hex: "#f97316" },
  { name: "Red", hex: "#ef4444" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Indigo", hex: "#6366f1" },
];

type StepFourProps = {
  register: UseFormRegister<FormValues>;
  isSubmitting: boolean;
  logoFile: File | null;
  onLogoChange: (file: File | null) => void;
  primaryColor: string;
  onColorChange: (color: string) => void;
};

const StepFour = ({ register, isSubmitting, logoFile, onLogoChange, primaryColor, onColorChange }: StepFourProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onLogoChange(file);
  };

  const previewUrl = logoFile ? URL.createObjectURL(logoFile) : null;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Create your organization</h1>
        <p>
          This will help us personalize your experience and provide you with the
          best possible service.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative cursor-pointer"
        >
          <Avatar className="w-24 h-24 border-2 border-dashed border-muted-foreground/40 group-hover:border-primary transition-colors">
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt="Organization logo" className="object-cover" />
            ) : (
              <AvatarFallback className="bg-muted">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-xs text-muted-foreground mt-2 block text-center">
            {logoFile ? "Change logo" : "Upload logo"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <Label htmlFor="organizationName">Organization Name</Label>
        <Input
          id="organizationName"
          type="text"
          placeholder="e.g. Dashboard Inc"
          className="focus-visible:ring-primary"
          {...register("organizationName", { required: true })}
        />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <Label>Brand Color</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              onClick={() => onColorChange(preset.hex)}
              className="w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center"
              style={{
                backgroundColor: preset.hex,
                borderColor: primaryColor === preset.hex ? preset.hex : "transparent",
                outline: primaryColor === preset.hex ? `2px solid ${preset.hex}` : "none",
                outlineOffset: "2px",
              }}
              title={preset.name}
            >
              {primaryColor === preset.hex && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-9 h-9 rounded-lg border-2 border-gray-200 cursor-pointer"
          />
          <Input
            value={primaryColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-28 font-mono text-sm"
            maxLength={7}
          />
          <div
            className="h-8 px-3 rounded-md text-white text-xs font-medium flex items-center"
            style={{ backgroundColor: primaryColor }}
          >
            Preview
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
};

export default StepFour;
