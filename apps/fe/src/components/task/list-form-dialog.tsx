import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { List, Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import z from "zod/v3";

const ListFormSchema = z.object({
  name: z.string().min(1, "Enter a list name"),
});

type ListFormValues = z.infer<typeof ListFormSchema>;

type ListFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting?: boolean;
  onSubmit: (name: string) => void;
};

export const ListFormDialog = ({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: ListFormDialogProps) => {
  const form = useForm<ListFormValues>({
    resolver: zodResolver(ListFormSchema),
    defaultValues: { name: "" },
  });

  const handleSubmit = (values: ListFormValues) => {
    onSubmit(values.name.trim());
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-center gap-4 space-y-0 border-b border-gray-200 bg-brand/5 px-6 py-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <List className="size-6" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="page-title text-2xl font-bold">
              New List
            </DialogTitle>
            <DialogDescription>
              Group related tasks together under a new list.
            </DialogDescription>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="px-6 py-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      List Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. General, Onboarding" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create List
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
