import { createSubscriber } from "@/services/marketing/subscriber-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormBody,
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MailPlus, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().optional(),
});

type SubscriberFormValues = z.infer<typeof schema>;

type SubscriberCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const SubscriberCreateDialog = ({
  open,
  onOpenChange,
}: SubscriberCreateDialogProps) => {
  const queryClient = useQueryClient();

  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: SubscriberFormValues) =>
      createSubscriber({ email: values.email, name: values.name || undefined }),
    onSuccess: () => {
      toast.success("Subscriber added");
      queryClient.invalidateQueries({ queryKey: ["marketing-subscribers"] });
      onOpenChange(false);
      form.reset();
    },
    onError: () => toast.error("Failed to add subscriber"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset();
      }}
    >
      <DialogContent variant="shell" className="sm:max-w-md">
        <DialogFormHeader
          icon={<MailPlus />}
          title="Add Subscriber"
          description="Adding an address here counts as consent you already hold."
        />

        <Form {...form}>
          <DialogFormBody className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DialogFormBody>

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit((values) => mutation.mutate(values))}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add Subscriber
            </Button>
          </DialogFormFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
