import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Avatar, AvatarFallback, AvatarImage } from "@dashboard/ui/components/avatar";
import { Camera, Loader2 } from "lucide-react";
import { useRef } from "react";
import type { UseFormRegister } from "react-hook-form";
import { type FormValues } from "../onboarding";

type StepFourProps = {
  register: UseFormRegister<FormValues>;
  isSubmitting: boolean;
  logoFile: File | null;
  onLogoChange: (file: File | null) => void;
};

const StepFour = ({ register, isSubmitting, logoFile, onLogoChange }: StepFourProps) => {
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
