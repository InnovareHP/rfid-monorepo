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
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@dashboard/ui/components/spinner";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Mirrors emailAndPassword.minPasswordLength on the server; a shorter value here
// would fail server side with a less useful message.
const resetSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters."),
    confirm: z.string(),
  })
  .superRefine(({ password, confirm }, ctx) => {
    if (password !== confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm"],
        message: "Passwords do not match.",
      });
    }
  });

type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordVerifyForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { token } = useSearch({ strict: false }) as { token?: string };

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async ({ password }: ResetValues) => {
    if (!token) return;

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (error) {
      toast.error(error.message ?? "Could not set your password.");
      return;
    }

    // Every other session was revoked server side, so sign-in is the next step.
    toast.success("Password set. Sign in to continue.");
    await navigate({ to: "/login", replace: true });
  };

  // A link that arrives without a token is expired, tampered with, or was opened
  // from the wrong mail.
  if (!token) {
    return (
      <AuthPanel className={className} {...props}>
        <div className="space-y-4 text-center">
          <h2 className="text-2xl xl:text-3xl font-bold text-brand">
            This link is not valid
          </h2>
          <p className="text-sm text-muted-foreground">
            Reset links expire after 10 minutes. Request a new one and open the
            most recent email.
          </p>
          <Button asChild className="w-full">
            <Link to="/reset-password">Request a new link</Link>
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
            Choose a password
          </h2>
          <p className="text-sm text-muted-foreground">
            Setting it signs out every other session.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
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
                  <span>Saving...</span>
                </div>
              ) : (
                <span>Set password</span>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </AuthPanel>
  );
}
