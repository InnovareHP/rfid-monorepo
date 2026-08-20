import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Switch } from "@dashboard/ui/components/switch";
import type { FieldPath, UseFormReturn } from "react-hook-form";
import type { BlastBlockType, BlastFormValues } from "./blast-block-schema";
import { BlastColorField } from "./blast-color-field";
import { BlastRichTextField } from "./blast-rich-text-field";
import { BlastUploadButton } from "./blast-upload-button";

type BlastBlockFieldsProps = {
  form: UseFormReturn<BlastFormValues>;
  type: BlastBlockType;
  index: number;
};

// Field groups keyed by block type. Every group renders above the shared
// background fields, matching the panel order in the design.
export const BlastBlockFields = ({
  form,
  type,
  index,
}: BlastBlockFieldsProps) => {
  const path = (suffix: string) =>
    `blocks.${index}.props.${suffix}` as FieldPath<BlastFormValues>;

  const textField = (suffix: string, label: string, placeholder?: string) => (
    <FormField
      control={form.control}
      name={path(suffix)}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const switchField = (suffix: string, label: string, hint?: string) => (
    <FormField
      control={form.control}
      name={path(suffix)}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <FormControl>
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );

  const uploadField = (suffix: string, label: string) => (
    <FormField
      control={form.control}
      name={path(suffix)}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input
                placeholder="https://"
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
              />
            </FormControl>
            <BlastUploadButton
              onUploaded={(url) =>
                form.setValue(path(suffix), url, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  switch (type) {
    case "HEADLINE":
      return (
        <>
          <BlastRichTextField
            form={form}
            label="Heading"
            valueName={path("heading")}
            styleName={`blocks.${index}.props.headingStyle`}
          />
          <BlastRichTextField
            form={form}
            label="Subheading"
            valueName={path("subheading")}
            styleName={`blocks.${index}.props.subheadingStyle`}
          />
          {uploadField("logo", "Logo")}
        </>
      );
    case "TEXT":
      return (
        <>
          <BlastRichTextField
            form={form}
            label="Heading"
            valueName={path("heading")}
            styleName={`blocks.${index}.props.headingStyle`}
          />
          <BlastRichTextField
            form={form}
            label="Body"
            valueName={path("body")}
            styleName={`blocks.${index}.props.bodyStyle`}
          />
        </>
      );
    case "IMAGE":
      return (
        <>
          {uploadField("src", "Image URL")}
          {textField("alt", "Alt Text", "Body text appears here")}
          {textField("caption", "Caption")}
        </>
      );
    case "SEPARATOR":
      return (
        <BlastColorField
          form={form}
          name={path("color")}
          label="Line Color"
          fallback="#e4e4e7"
        />
      );
    case "FOOTER":
      return (
        <>
          {textField("text", "Footer Text", "Acme Health, 1847 Willow Creek")}
          {textField(
            "unsubscribeLabel",
            "Unsubscribe Label",
            "Unsubscribe from these emails"
          )}
          {switchField(
            "showSubscribe",
            "Show subscribe link",
            "For readers who got this forwarded. Signs them up to this organization."
          )}
          {textField(
            "subscribeLabel",
            "Subscribe Label",
            "Subscribe to these emails"
          )}
          {switchField("subscribeAsButton", "Show subscribe as a button")}
          <p className="text-xs text-muted-foreground">
            Remove this block and the email ships without an opt-out link, which
            commercial email is required to carry.
          </p>
        </>
      );
    case "SUBSCRIBE":
      return (
        <>
          <BlastRichTextField
            form={form}
            label="Description"
            valueName={path("description")}
            styleName={`blocks.${index}.props.descriptionStyle`}
          />
          {textField("label", "Button Label", "Subscribe")}
          <BlastColorField
            form={form}
            name={path("buttonColor")}
            label="Button Color"
            fallback="#0d3185"
          />
          <BlastColorField
            form={form}
            name={path("textColor")}
            label="Button Text Color"
            fallback="#ffffff"
          />
          <p className="text-xs text-muted-foreground">
            The link points at this organization's signup page and is filled in
            when the blast sends.
          </p>
        </>
      );
    case "BUTTON":
      return (
        <>
          {textField("label", "Button Label", "Learn More")}
          {textField("href", "Button URL", "https://")}
          <BlastColorField
            form={form}
            name={path("buttonColor")}
            label="Button Color"
            fallback="#0d3185"
          />
        </>
      );
  }
};
