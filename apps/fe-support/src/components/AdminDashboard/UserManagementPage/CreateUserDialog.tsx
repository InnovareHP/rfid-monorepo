import { createUser } from "@/services/admin/admin-service";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Spinner } from "@dashboard/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required")
    .max(120),
});

type CreateUserValues = z.infer<typeof schema>;

type CreateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateUserDialogProps) {
  // The label comes off the stream, so it names the step the server is on.
  const [step, setStep] = useState("");

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", organizationName: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateUserValues) => createUser(values, setStep),
    onSuccess: () => {
      toast.success("User created. A welcome email is on its way.");
      form.reset();
      setStep("");
      onCreated();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setStep("");
      form.setError("root", { message: error.message });
      toast.error(error.message);
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (createMutation.isPending) return;
    if (!next) {
      form.reset();
      setStep("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Creates the account and its organization, then emails the owner. The
            organization has no subscription until they check out.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate(values)
            )}
            className="space-y-4"
          >
            {form.formState.errors.root?.message ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Jordan Reyes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="off"
                      placeholder="owner@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    They sign in by enrolling a passkey from the login page, so
                    no password is set here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input placeholder="Reyes Care Group" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {createMutation.isPending && step ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                {step}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={createMutation.isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
