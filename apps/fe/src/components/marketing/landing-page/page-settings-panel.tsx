import type { LandingPageFormValues } from "@/components/marketing/landing-page/landing-page-form-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import type { UseFormReturn } from "react-hook-form";

type PageSettingsPanelProps = {
  form: UseFormReturn<LandingPageFormValues>;
};

export const PageSettingsPanel = ({ form }: PageSettingsPanelProps) => (
  <div className="space-y-4">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Page Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="slug"
      render={({ field }) => (
        <FormItem>
          <FormLabel>URL Slug</FormLabel>
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-xs text-gray-400">
              {`${window.location.origin}/l/`}
            </span>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="seoTitle"
      render={({ field }) => (
        <FormItem>
          <FormLabel>SEO Title</FormLabel>
          <FormControl>
            <Input maxLength={70} {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="seoDescription"
      render={({ field }) => (
        <FormItem>
          <FormLabel>SEO Description</FormLabel>
          <FormControl>
            <Input maxLength={160} {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);
