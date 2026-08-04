import type { LandingPageFormValues } from "@/components/marketing/landing-page/landing-page-form-schema";
import { uploadImage } from "@/services/image/image-service";
import type { MarketingForm } from "@/services/marketing/form-service";
import type { LandingSection } from "@/services/marketing/landing-page-service";
import { Button } from "@dashboard/ui/components/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import {
  AlignLeft,
  Copy,
  Heading,
  Image,
  MousePointerClick,
  Rows3,
  Trash2,
} from "lucide-react";
import type { ComponentType } from "react";
import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const HEADER_BY_TYPE: Record<
  LandingSection["type"],
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  HERO: { label: "Hero", icon: Heading },
  TEXT: { label: "Text", icon: AlignLeft },
  IMAGE: { label: "Image", icon: Image },
  FORM_EMBED: { label: "Form Embed", icon: Rows3 },
  CTA: { label: "Call To Action", icon: MousePointerClick },
};

type SectionEditorPanelProps = {
  form: UseFormReturn<LandingPageFormValues>;
  section: LandingSection;
  index: number;
  availableForms: MarketingForm[];
  onDuplicate: () => void;
  onDelete: () => void;
};

export const SectionEditorPanel = ({
  form,
  section,
  index,
  availableForms,
  onDuplicate,
  onDelete,
}: SectionEditorPanelProps) => {
  const { label, icon: Icon } = HEADER_BY_TYPE[section.type];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-700" />
        <h3 className="text-lg font-medium text-gray-900">{label}</h3>
      </div>

      {section.type === "HERO" && <HeroFields form={form} index={index} />}
      {section.type === "TEXT" && <TextFields form={form} index={index} />}
      {section.type === "IMAGE" && <ImageFields form={form} index={index} />}
      {section.type === "FORM_EMBED" && (
        <FormEmbedFields
          form={form}
          index={index}
          availableForms={availableForms}
        />
      )}
      {section.type === "CTA" && <CtaFields form={form} index={index} />}

      <div className="flex gap-2 border-t border-gray-100 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDuplicate}
        >
          <Copy className="h-4 w-4 mr-1" />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDelete}
        >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
        </Button>
      </div>
    </div>
  );
};

type FieldsProps = {
  form: UseFormReturn<LandingPageFormValues>;
  index: number;
};

type UploadButtonProps = {
  onUploaded: (url: string) => void;
};

const UploadButton = ({ onUploaded }: UploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const result = await uploadImage(file);
      onUploaded(result.secure_url);
    } catch {
      toast.error("Failed to upload image");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
      >
        Choose File
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
};

// Hero, Text and Image all carry the same optional button pair.
const CtaFieldPair = ({ form, index }: FieldsProps) => (
  <>
    <FormField
      control={form.control}
      name={`sections.${index}.props.ctaLabel`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Button Label</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`sections.${index}.props.ctaHref`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Button URL</FormLabel>
          <FormControl>
            <Input placeholder="https://" {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);

const HeroFields = ({ form, index }: FieldsProps) => (
  <>
    <FormField
      control={form.control}
      name={`sections.${index}.props.heading`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Heading</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`sections.${index}.props.subheading`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Subheading</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`sections.${index}.props.imageSrc`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Background Image</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input placeholder="https://" {...field} value={field.value ?? ""} />
            </FormControl>
            <UploadButton
              onUploaded={(url) =>
                form.setValue(`sections.${index}.props.imageSrc`, url, {
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
    <CtaFieldPair form={form} index={index} />
  </>
);

const TextFields = ({ form, index }: FieldsProps) => (
  <>
    <FormField
      control={form.control}
      name={`sections.${index}.props.heading`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Heading</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`sections.${index}.props.body`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Body</FormLabel>
          <FormControl>
            <Textarea rows={6} {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <CtaFieldPair form={form} index={index} />
  </>
);

const ImageFields = ({ form, index }: FieldsProps) => (
  <>
    <FormField
      control={form.control}
      name={`sections.${index}.props.src`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Image URL</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input placeholder="https://" {...field} value={field.value ?? ""} />
            </FormControl>
            <UploadButton
              onUploaded={(url) =>
                form.setValue(`sections.${index}.props.src`, url, {
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
    <FormField
      control={form.control}
      name={`sections.${index}.props.alt`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Alt Text</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`sections.${index}.props.caption`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Caption</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <CtaFieldPair form={form} index={index} />
  </>
);

type FormEmbedFieldsProps = FieldsProps & { availableForms: MarketingForm[] };

const FormEmbedFields = ({
  form,
  index,
  availableForms,
}: FormEmbedFieldsProps) => {
  const publishedForms = availableForms.filter(
    (candidate) => candidate.status === "PUBLISHED"
  );

  return (
    <>
      <FormField
        control={form.control}
        name={`sections.${index}.props.heading`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Heading</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="formId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Form</FormLabel>
            <Select
              value={field.value ?? undefined}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Published Form" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {publishedForms.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {publishedForms.length === 0 && (
              <p className="text-xs text-gray-400">
                No published forms yet. Publish a form first.
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

const CtaFields = ({ form, index }: FieldsProps) => (
  <>
    <FormField
      control={form.control}
      name={`sections.${index}.props.heading`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Heading</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`sections.${index}.props.buttonLabel`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Button Label</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={`sections.${index}.props.href`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Button URL</FormLabel>
          <FormControl>
            <Input placeholder="https://" {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);
