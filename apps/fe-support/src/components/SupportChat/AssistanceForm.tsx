import { deleteImage, uploadImage } from "@/services/image/image-service";
import { createSupportTicket } from "@/services/support/support-service";
import { TICKET_CATEGORIES, TicketCategory } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Form,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ImageDropper } from "./ImageDropper";

const assistanceFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Please describe your issue"),
  category: z.enum(TICKET_CATEGORIES),
  images: z.array(z.instanceof(File)).optional(),
});

type AssistanceFormValues = z.infer<typeof assistanceFormSchema>;

export const AssistanceForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceFormSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      category: "GENERAL",
      images: [],
    },
  });

  const onSubmit = async (data: AssistanceFormValues) => {
    const uploadedImages: Awaited<ReturnType<typeof uploadImage>>[] = [];
    try {
      for (const image of data.images ?? []) {
        uploadedImages.push(await uploadImage(image));
      }

      await createSupportTicket({
        title: data.title,
        subject: data.subject,
        description: data.description,
        category: data.category as TicketCategory,
        imageUrl: uploadedImages.map((image) => image.url),
      });

      form.reset();
      onSuccess();
    } catch (error) {
      await Promise.all(
        uploadedImages.map((img) => deleteImage(img.public_id))
      );
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 mt-2 w-full"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ticket title"
                  className="h-9 text-sm rounded-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Subject</FormLabel>
              <FormControl>
                <Input
                  placeholder="Brief subject"
                  className="h-9 text-sm rounded-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your issue or question..."
                  className="min-h-20 text-sm rounded-lg resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="h-9 text-sm rounded-lg w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TICKET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Attachments</FormLabel>
              <FormControl>
                <ImageDropper
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <Button
          disabled={form.formState.isSubmitting}
          type="submit"
          size="sm"
          className="w-full cursor-pointer"
        >
          {form.formState.isSubmitting ? "Submitting..." : "Submit request"}
        </Button>
      </form>
    </Form>
  );
};
