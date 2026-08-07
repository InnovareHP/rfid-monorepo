import { OptionalTag, RequiredLegend, RequiredMark } from "@/components/field-marks";
import type { FormBuilderValues } from "@/components/marketing/forms/form-builder-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Copy } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

type FormSettingsPanelProps = {
  form: UseFormReturn<FormBuilderValues>;
  publicUrl: string;
};

export const FormSettingsPanel = ({
  form,
  publicUrl,
}: FormSettingsPanelProps) => {
  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied");
  };

  return (
    <div className="space-y-5">
      <RequiredLegend className="text-xs text-muted-foreground" />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>
              Form Name
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input placeholder="Lead Generation" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-1.5">
        <Label htmlFor="public-url" className="flex items-center gap-1.5">
          Public Link
          <span className="text-xs font-normal text-muted-foreground">
            Generated
          </span>
        </Label>
        <div className="relative">
          <Input
            id="public-url"
            value={publicUrl}
            readOnly
            className="pr-9 text-muted-foreground"
          />
          <button
            type="button"
            onClick={copyPublicUrl}
            aria-label="Copy form link"
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <FormField
        control={form.control}
        name="submitButtonText"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel>
              Submit Button Text
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input placeholder="Submit" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="redirectUrl"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel className="flex items-center gap-1.5">
              Redirect URL
              <OptionalTag />
            </FormLabel>
            <FormControl>
              <Input placeholder="https://" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
