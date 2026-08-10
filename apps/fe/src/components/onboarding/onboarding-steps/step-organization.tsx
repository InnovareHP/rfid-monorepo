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
import { Camera } from "lucide-react";
import { useRef } from "react";
import type { Control } from "react-hook-form";
import { type FormValues } from "../onboarding";

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
