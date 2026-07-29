import { uploadImage } from "@/services/image/image-service";
import type { MarketingForm } from "@/services/marketing/form-service";
import type {
  CtaSection,
  FormEmbedSection,
  HeroSection,
  ImageSection,
  LandingSection,
  TextSection,
} from "@/services/marketing/landing-page-service";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Local FE mirrors of the backend section schemas — never import the API's
// Zod module across the API/FE boundary (same precedent as public-form-page).
const optionalUrl = z
  .string()
  .optional()
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Must be a valid http(s) URL",
  });

const requiredUrl = z
  .string()
  .min(1, "URL is required")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Must be a valid http(s) URL",
  });

const heroSchema = z.object({
  heading: z.string().min(1, "Heading is required").max(200),
  subheading: z.string().max(500).optional(),
  imageSrc: optionalUrl,
  ctaLabel: z.string().max(100).optional(),
  ctaHref: optionalUrl,
});

const textSchema = z.object({
  heading: z.string().max(200).optional(),
  body: z.string().min(1, "Body is required").max(5000),
});

const imageSchema = z.object({
  src: requiredUrl,
  alt: z.string().max(200),
  caption: z.string().max(300).optional(),
});

const formEmbedSchema = z.object({
  heading: z.string().max(200).optional(),
});

const ctaSchema = z.object({
  heading: z.string().max(200).optional(),
  buttonLabel: z.string().min(1, "Button label is required").max(100),
  href: requiredUrl,
});

type SectionEditorPanelProps = {
  section: LandingSection;
  onChange: (section: LandingSection) => void;
  formId: string | null;
  onFormIdChange: (formId: string | null) => void;
  availableForms: MarketingForm[];
};

export const SectionEditorPanel = ({
  section,
  onChange,
  formId,
  onFormIdChange,
  availableForms,
}: SectionEditorPanelProps) => {
  switch (section.type) {
    case "HERO":
      return (
        <HeroEditor key={section.id} section={section} onChange={onChange} />
      );
    case "TEXT":
      return (
        <TextEditor key={section.id} section={section} onChange={onChange} />
      );
    case "IMAGE":
      return (
        <ImageEditor key={section.id} section={section} onChange={onChange} />
      );
    case "FORM_EMBED":
      return (
        <FormEmbedEditor
          key={section.id}
          section={section}
          onChange={onChange}
          formId={formId}
          onFormIdChange={onFormIdChange}
          availableForms={availableForms}
        />
      );
    case "CTA":
      return (
        <CtaEditor key={section.id} section={section} onChange={onChange} />
      );
    default:
      return null;
  }
};

type HeroEditorProps = {
  section: HeroSection;
  onChange: (section: LandingSection) => void;
};

const HeroEditor = ({ section, onChange }: HeroEditorProps) => {
  const form = useForm<z.infer<typeof heroSchema>>({
    resolver: zodResolver(heroSchema),
    defaultValues: section.props,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = heroSchema.safeParse(values);
      if (parsed.success) onChange({ ...section, props: parsed.data });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">Hero</h3>
      <div className="space-y-1.5">
        <Label htmlFor="hero-heading">Heading</Label>
        <Input id="hero-heading" {...form.register("heading")} />
        {form.formState.errors.heading && (
          <p className="text-xs text-destructive">
            {form.formState.errors.heading.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hero-subheading">Subheading</Label>
        <Input id="hero-subheading" {...form.register("subheading")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hero-image">Image URL</Label>
        <Input
          id="hero-image"
          placeholder="https://..."
          {...form.register("imageSrc")}
        />
        {form.formState.errors.imageSrc && (
          <p className="text-xs text-destructive">
            {form.formState.errors.imageSrc.message}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hero-cta-label">Button label</Label>
          <Input id="hero-cta-label" {...form.register("ctaLabel")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hero-cta-href">Button URL</Label>
          <Input
            id="hero-cta-href"
            placeholder="https://..."
            {...form.register("ctaHref")}
          />
          {form.formState.errors.ctaHref && (
            <p className="text-xs text-destructive">
              {form.formState.errors.ctaHref.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

type TextEditorProps = {
  section: TextSection;
  onChange: (section: LandingSection) => void;
};

const TextEditor = ({ section, onChange }: TextEditorProps) => {
  const form = useForm<z.infer<typeof textSchema>>({
    resolver: zodResolver(textSchema),
    defaultValues: section.props,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = textSchema.safeParse(values);
      if (parsed.success) onChange({ ...section, props: parsed.data });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">Text</h3>
      <div className="space-y-1.5">
        <Label htmlFor="text-heading">Heading</Label>
        <Input id="text-heading" {...form.register("heading")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="text-body">Body</Label>
        <Textarea id="text-body" rows={6} {...form.register("body")} />
        {form.formState.errors.body && (
          <p className="text-xs text-destructive">
            {form.formState.errors.body.message}
          </p>
        )}
      </div>
    </div>
  );
};

type ImageEditorProps = {
  section: ImageSection;
  onChange: (section: LandingSection) => void;
};

const ImageEditor = ({ section, onChange }: ImageEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<z.infer<typeof imageSchema>>({
    resolver: zodResolver(imageSchema),
    defaultValues: section.props,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = imageSchema.safeParse(values);
      if (parsed.success) onChange({ ...section, props: parsed.data });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const result = await uploadImage(file);
      form.setValue("src", result.secure_url, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch {
      toast.error("Failed to upload image");
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">Image</h3>
      <div className="space-y-1.5">
        <Label htmlFor="image-src">Image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image-src"
            placeholder="https://..."
            {...form.register("src")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {form.formState.errors.src && (
          <p className="text-xs text-destructive">
            {form.formState.errors.src.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="image-alt">Alt text</Label>
        <Input id="image-alt" {...form.register("alt")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="image-caption">Caption</Label>
        <Input id="image-caption" {...form.register("caption")} />
      </div>
    </div>
  );
};

type FormEmbedEditorProps = {
  section: FormEmbedSection;
  onChange: (section: LandingSection) => void;
  formId: string | null;
  onFormIdChange: (formId: string | null) => void;
  availableForms: MarketingForm[];
};

const FormEmbedEditor = ({
  section,
  onChange,
  formId,
  onFormIdChange,
  availableForms,
}: FormEmbedEditorProps) => {
  const form = useForm<z.infer<typeof formEmbedSchema>>({
    resolver: zodResolver(formEmbedSchema),
    defaultValues: section.props,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = formEmbedSchema.safeParse(values);
      if (parsed.success) onChange({ ...section, props: parsed.data });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  const publishedForms = availableForms.filter(
    (candidate) => candidate.status === "PUBLISHED"
  );

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">Form embed</h3>
      <div className="space-y-1.5">
        <Label htmlFor="form-embed-heading">Heading</Label>
        <Input id="form-embed-heading" {...form.register("heading")} />
      </div>
      <div className="space-y-1.5">
        <Label>Form</Label>
        <Select
          value={formId ?? undefined}
          onValueChange={(value) => onFormIdChange(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a published form" />
          </SelectTrigger>
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
      </div>
    </div>
  );
};

type CtaEditorProps = {
  section: CtaSection;
  onChange: (section: LandingSection) => void;
};

const CtaEditor = ({ section, onChange }: CtaEditorProps) => {
  const form = useForm<z.infer<typeof ctaSchema>>({
    resolver: zodResolver(ctaSchema),
    defaultValues: section.props,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = ctaSchema.safeParse(values);
      if (parsed.success) onChange({ ...section, props: parsed.data });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">Call to action</h3>
      <div className="space-y-1.5">
        <Label htmlFor="cta-heading">Heading</Label>
        <Input id="cta-heading" {...form.register("heading")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cta-button-label">Button label</Label>
        <Input id="cta-button-label" {...form.register("buttonLabel")} />
        {form.formState.errors.buttonLabel && (
          <p className="text-xs text-destructive">
            {form.formState.errors.buttonLabel.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cta-href">Button URL</Label>
        <Input
          id="cta-href"
          placeholder="https://..."
          {...form.register("href")}
        />
        {form.formState.errors.href && (
          <p className="text-xs text-destructive">
            {form.formState.errors.href.message}
          </p>
        )}
      </div>
    </div>
  );
};
