import { PasswordInput } from "@/components/password-input";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Spinner } from "@dashboard/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Fingerprint } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const passwordSignInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

// Existing account: password sign-in first, passkey as the fallback.
export const SignInSection = ({
  email,
  pending,
  onPasswordSignIn,
  onPasskeySignIn,
}: {
  email: string;
  pending: boolean;
  onPasswordSignIn: (
    values: z.infer<typeof passwordSignInSchema>
  ) => Promise<void>;
  onPasskeySignIn: () => void;
}) => {
  const form = useForm<z.infer<typeof passwordSignInSchema>>({
    resolver: zodResolver(passwordSignInSchema),
    defaultValues: { email, password: "" },
  });

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(onPasswordSignIn)}
        >
          {/* Prefilled from the invitation and left editable: the invite is
              bound to this address, but someone whose account uses a different
              one still needs a way through. */}
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
                    placeholder="you@company.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-11"
            disabled={form.formState.isSubmitting || pending}
          >
            {form.formState.isSubmitting ? (
              <Spinner size="sm" className="text-current" />
            ) : (
              "Sign in and join"
            )}
          </Button>
        </form>
      </Form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="w-full h-11"
        disabled={pending}
        onClick={onPasskeySignIn}
      >
        {pending ? (
          <Spinner size="sm" className="text-current" />
        ) : (
          <>
            <Fingerprint className="mr-2 w-4 h-4" />
            Sign in with a passkey
          </>
        )}
      </Button>
    </div>
  );
};
