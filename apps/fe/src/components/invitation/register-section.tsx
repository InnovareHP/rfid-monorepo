import { PasswordInput } from "@/components/password-input";
import { Button } from "@dashboard/ui/components/button";
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

// The floor matches emailAndPassword.minPasswordLength on the API.
export const passwordRegisterSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

// No account yet: choose a password now, or skip straight to a passkey.
export const RegisterSection = ({
  pending,
  onPasswordRegister,
  onPasskeyRegister,
}: {
  pending: boolean;
  onPasswordRegister: (
    values: z.infer<typeof passwordRegisterSchema>
  ) => Promise<void>;
  onPasskeyRegister: () => void;
}) => {
  const form = useForm<z.infer<typeof passwordRegisterSchema>>({
    resolver: zodResolver(passwordRegisterSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(onPasswordRegister)}
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
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
            className="w-full h-11"
            disabled={form.formState.isSubmitting || pending}
          >
            {form.formState.isSubmitting ? (
              <Spinner size="sm" className="text-current" />
            ) : (
              "Create account and join"
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
        onClick={onPasskeyRegister}
      >
        {pending ? (
          <Spinner size="sm" className="text-current" />
        ) : (
          <>
            <Fingerprint className="mr-2 w-4 h-4" />
            Create a passkey and join
          </>
        )}
      </Button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        A passkey is unlocked with your fingerprint, face, or device PIN — no
        password to remember.
      </p>
    </div>
  );
};
