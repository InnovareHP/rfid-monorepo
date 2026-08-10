import { AuthPanel } from "@/components/auth-panel";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Spinner } from "@dashboard/ui/components/spinner";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type RequestValues = z.infer<typeof requestSchema>;

// Also the way an existing passkey-only account sets a first password, so the
// copy avoids implying the caller already has one.
export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [sent, setSent] = useState(false);

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: RequestValues) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password/verify`,
    });

    // A per-address answer would confirm which addresses hold accounts, so the
    // same confirmation shows either way.
    if (error) {
      toast.error(error.message ?? "Could not send the reset email.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <AuthPanel className={className} {...props}>
        <div className="space-y-4 text-center">
          <h2 className="text-2xl xl:text-3xl font-bold text-brand">
            Check your email
          </h2>
          <p className="text-sm text-muted-foreground">
            If an account exists for that address, a reset link is on its way.
            The link is good for 10 minutes.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel className={className} {...props}>
      <div className="space-y-5">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl xl:text-3xl font-bold text-brand">
            Set a new password
          </h2>
          <p className="text-sm text-muted-foreground">
            We will email you a link to set one.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="username"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full h-10 xl:h-12 font-semibold"
            >
              {form.formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" className="text-current" />
                  <span>Sending...</span>
                </div>
              ) : (
                <span>Email me a link</span>
              )}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Back to sign in.
          </Link>
        </p>
      </div>
    </AuthPanel>
  );
}
