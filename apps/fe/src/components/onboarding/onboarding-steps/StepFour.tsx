import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Button } from "@dashboard/ui/components/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Camera, Check, Loader2 } from "lucide-react";
import { useRef } from "react";
import type { Control } from "react-hook-form";
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
  control: Control<FormValues>;
  isSubmitting: boolean;
  progress: string;
};

const StepFour = ({ control, isSubmitting, progress }: StepFourProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Create your organization</h1>
        <p>
          This will help us personalize your experience and provide you with the
          best possible service.
        </p>
      </div>

      <FormField
        control={control}
        name="logoFile"
        render={({ field }) => {
          const previewUrl = field.value
            ? URL.createObjectURL(field.value)
            : null;

          return (
            <FormItem className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer"
              >
                <Avatar className="w-24 h-24 border-2 border-dashed border-muted-foreground/40 group-hover:border-primary transition-colors">
                  {previewUrl ? (
                    <AvatarImage
                      src={previewUrl}
                      alt="Organization logo"
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-muted">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-xs text-muted-foreground mt-2 block text-center">
                  {field.value ? "Change logo" : "Upload logo"}
                </span>
              </button>
              <FormControl>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => field.onChange(e.target.files?.[0] ?? null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={control}
        name="organizationName"
        render={({ field }) => (
          <FormItem className="max-w-md mx-auto">
            <FormLabel>Organization Name</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="e.g. Dashboard Inc"
                className="focus-visible:ring-primary"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="brandColor"
        render={({ field }) => (
          <FormItem className="max-w-md mx-auto">
            <FormLabel>Brand Color</FormLabel>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => field.onChange(preset.hex)}
                  className="w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center"
                  style={{
                    backgroundColor: preset.hex,
                    borderColor:
                      field.value === preset.hex ? preset.hex : "transparent",
                    outline:
                      field.value === preset.hex
                        ? `2px solid ${preset.hex}`
                        : "none",
                    outlineOffset: "2px",
                  }}
                  title={preset.name}
                >
                  {field.value === preset.hex && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="color"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="w-9 h-9 rounded-lg border-2 border-gray-200 cursor-pointer"
              />
              <FormControl>
                <Input
                  {...field}
                  className="w-28 font-mono text-sm"
                  maxLength={7}
                />
              </FormControl>
              <div
                className="h-8 px-3 rounded-md text-white text-xs font-medium flex items-center"
                style={{ backgroundColor: field.value }}
              >
                Preview
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col items-center gap-2">
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Continue"
          )}
        </Button>
        {isSubmitting && progress && (
          <p className="text-sm text-muted-foreground">{progress}</p>
        )}
      </div>
    </div>
  );
};

export default StepFour;
