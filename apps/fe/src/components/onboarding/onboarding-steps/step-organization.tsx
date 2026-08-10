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
import { Spinner } from "@dashboard/ui/components/spinner";
import { Camera, Check } from "lucide-react";
import { useRef } from "react";
import type { Control } from "react-hook-form";
import { type FormValues } from "../onboarding";

const PRESET_COLORS = [
  { name: "Refidly navy", hex: "#0d3185" },
  { name: "Sky", hex: "#2c86d9" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Orange", hex: "#f97316" },
  { name: "Red", hex: "#ef4444" },
  { name: "Pink", hex: "#ec4899" },
];

type StepOrganizationProps = {
  control: Control<FormValues>;
  isSubmitting: boolean;
  progress: string;
};

const StepOrganization = ({
  control,
  isSubmitting,
  progress,
}: StepOrganizationProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl xl:text-3xl font-bold text-brand">
          Create your organization
        </h2>
        <p className="text-sm xl:text-base text-muted-foreground">
          Your logo and colour brand every referral, form, and email you send.
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
                <Avatar className="w-24 h-24 border-2 border-dashed border-border group-hover:border-primary transition-colors">
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
          <FormItem>
            <FormLabel className="text-sm font-semibold text-brand">
              Organization name
            </FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="e.g. Refidly Health"
                className="h-10 xl:h-12"
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
          <FormItem>
            <FormLabel className="text-sm font-semibold text-brand">
              Brand colour
            </FormLabel>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => field.onChange(preset.hex)}
                  aria-label={preset.name}
                  title={preset.name}
                  className="w-9 h-9 rounded-full flex items-center justify-center ring-offset-2 ring-offset-background transition-all data-[selected=true]:ring-2 data-[selected=true]:ring-ring"
                  data-selected={field.value === preset.hex}
                  style={{ backgroundColor: preset.hex }}
                >
                  {field.value === preset.hex && (
                    <Check className="w-4 h-4 text-brand-foreground" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="color"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                aria-label="Custom brand colour"
                className="w-9 h-9 rounded-lg border-2 border-border cursor-pointer"
              />
              <FormControl>
                <Input {...field} className="w-28 font-mono text-sm" maxLength={7} />
              </FormControl>
              <div
                className="h-9 px-3 rounded-md text-brand-foreground text-xs font-medium flex items-center"
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
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 xl:h-12 text-sm xl:text-base font-semibold rounded-lg shadow-sm"
        >
          {isSubmitting ? (
            <Spinner size="sm" className="text-current" />
          ) : (
            "Create organization"
          )}
        </Button>
        {isSubmitting && progress && (
          <p className="text-sm text-muted-foreground">{progress}</p>
        )}
      </div>
    </div>
  );
};

export default StepOrganization;
