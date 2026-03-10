import {
  createArticle,
  getArticleById,
  updateArticle,
  type ManualCategory,
  type ManualArticle,
} from "@/services/manual/manual-service";
import { uploadImage } from "@/services/image/image-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Switch } from "@dashboard/ui/components/switch";
import { Textarea } from "@dashboard/ui/components/textarea";
import { Separator } from "@dashboard/ui/components/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const stepSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().optional(),
});

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  summary: z.string().min(1, "Summary is required"),
  categoryId: z.string().min(1, "Category is required"),
  published: z.boolean(),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export function ManualArticleForm({
  open,
  onOpenChange,
  article,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ManualArticle | null;
  categories: ManualCategory[];
}) {
  const queryClient = useQueryClient();
  const [uploadingStepIndex, setUploadingStepIndex] = useState<number | null>(
    null
  );

  const articleQuery = useQuery({
    queryKey: ["manual-article", article?.id],
    queryFn: () => getArticleById(article!.id),
    enabled: !!article?.id,
  });

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      slug: "",
      summary: "",
      categoryId: categories[0]?.id ?? "",
      published: false,
      steps: [{ title: "", content: "", imageUrl: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "steps",
  });

  useEffect(() => {
    if (!open) return;
    const data = articleQuery.data ?? article;
    if (data) {
      form.reset({
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        categoryId: data.categoryId,
        published: data.published,
        steps:
          data.steps && data.steps.length > 0
            ? data.steps.map((s) => ({
                title: s.title ?? "",
                content: s.content,
                imageUrl: s.imageUrl ?? "",
              }))
            : [{ title: "", content: "", imageUrl: "" }],
      });
    } else {
      form.reset({
        title: "",
        slug: "",
        summary: "",
        categoryId: categories[0]?.id ?? "",
        published: false,
        steps: [{ title: "", content: "", imageUrl: "" }],
      });
    }
  }, [article, articleQuery.data, categories, open, form]);

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingStepIndex(index);
    try {
      const result = await uploadImage(file);
      form.setValue(`steps.${index}.imageUrl`, result.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingStepIndex(null);
    }
  };

  const mutation = useMutation({
    mutationFn: (values: ArticleFormValues) => {
      const payload = {
        title: values.title,
        slug:
          values.slug ||
          values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        summary: values.summary,
        categoryId: values.categoryId,
        published: values.published,
        steps: values.steps.map((s, i) => ({
          title: s.title || undefined,
          content: s.content,
          imageUrl: s.imageUrl || undefined,
          order: i,
        })),
      };
      return article
        ? updateArticle(article.id, payload)
        : createArticle(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-articles"] });
      queryClient.invalidateQueries({ queryKey: ["manual-article"] });
      onOpenChange(false);
      toast.success(article ? "Article updated" : "Article created");
    },
    onError: () =>
      toast.error(
        article ? "Failed to update article" : "Failed to create article"
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {article ? "Edit Article" : "New Article"}
          </DialogTitle>
          <DialogDescription>
            Create a step-by-step guide with text and images.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-6 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. How to Import Leads"
                        {...field}
                      />
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
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Auto-generated from title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description shown in search results"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Published</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Steps</h3>
                  <p className="text-xs text-muted-foreground">
                    Add steps with text explanations and optional screenshots
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ title: "", content: "", imageUrl: "" })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Step
                </Button>
              </div>

              {fields.map((field, index) => {
                const imageUrl = form.watch(`steps.${index}.imageUrl`);
                return (
                  <div
                    key={field.id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Step {index + 1}
                        </span>
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`steps.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Step Title (optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Open the Import dialog"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`steps.${index}.content`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Explain what the user should do in this step..."
                              className="min-h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Image (optional)</Label>
                      {imageUrl ? (
                        <div className="relative inline-block">
                          <img
                            src={imageUrl}
                            alt={`Step ${index + 1}`}
                            className="max-h-48 rounded-md border object-contain"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -right-2 -top-2 h-6 w-6"
                            onClick={() =>
                              form.setValue(`steps.${index}.imageUrl`, "")
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/50">
                          <ImagePlus className="h-5 w-5" />
                          {uploadingStepIndex === index
                            ? "Uploading..."
                            : "Click to upload a screenshot"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingStepIndex === index}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(index, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Saving..."
                  : article
                    ? "Update Article"
                    : "Create Article"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
