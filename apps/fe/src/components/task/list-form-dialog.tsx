import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
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
        <DialogFormHeader
          icon={<List />}
          title="New List"
          description="Group related tasks together under a new list."
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="px-6 py-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      List Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. General, Onboarding" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFormFooter>
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
               
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create List
              </Button>
            </DialogFormFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
