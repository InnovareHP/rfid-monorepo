import { PasswordInput } from "@/components/password-input";
import { AuthPanel } from "@/components/auth-panel";
import { authClient } from "@/lib/auth-client";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal-links";
import {
  completeSignup,
  sendSignupOtp,
  verifySignupOtp,
} from "@/services/passkeys/passkeys-service";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@dashboard/ui/components/input-otp";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Mail, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";

const detailsSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

// The floor matches emailAndPassword.minPasswordLength on the API.
const passwordSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useRouter();
  const queryClient = useQueryClient();
  const [details, setDetails] = useState<z.infer<typeof detailsSchema> | null>(
    null
  );
  // Present only once the emailed code has been checked by the API.
  const [signupContext, setSignupContext] = useState<string | null>(null);

  const detailsForm = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", email: "" },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleSendCode = async (values: z.infer<typeof detailsSchema>) => {
    try {
      await sendSignupOtp(values.email);
      setDetails(values);
      toast.success("We sent a verification code to your email.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send a code."
      );
    }
  };

  // Verification stands on its own so the password is only asked for once the
  // address is proven. The claim it returns is what authorises the next step.
  const handleVerifyCode = async (values: z.infer<typeof codeSchema>) => {
    if (!details) return;

    try {
      const grant = await verifySignupOtp(
        details.email,
        details.name,
        values.code
      );
      setSignupContext(grant.context);
      toast.success("Email verified. Choose a password.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "That code is invalid or has expired."
      );
    }
  };

  const handleCreateAccount = async (values: z.infer<typeof passwordSchema>) => {
    if (!details || !signupContext) return;

    try {
      await completeSignup(signupContext, values.password);

      const { error: signInError } = await authClient.signIn.email({
        email: details.email,
        password: values.password,
      });
      if (signInError) {
        toast.success("Account created. Sign in to continue.");
        await navigate.navigate({ to: "/login", replace: true });
        return;
      }

      // The root route reads the session out of the query cache, which still
      // holds the signed-out value. Without seeding it and re-running the
      // loaders, onboarding sees no user and bounces to the login page.
      const { data: freshSession } = await authClient.getSession();
      queryClient.setQueryData(["session"], freshSession);
      await navigate.invalidate();

      await navigate.navigate({ to: "/onboarding", replace: true });
    } catch (error) {
      // The claim is spent either way, so a failure here restarts the signup.
      setSignupContext(null);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create your account. Start again."
      );
    }
  };

  return (
    <AuthPanel className={className} {...props}>
      <div className="space-y-5">
        <div className="space-y-1 text-center">
          <h2 className="text-3xl xl:text-4xl font-bold text-brand lg:whitespace-nowrap">
            Create account
          </h2>
          <p className="text-sm xl:text-base text-muted-foreground">
            {!details
              ? "Sign up to get started with your free account."
              : signupContext
                ? "Email verified. Choose a password to finish."
                : "Enter the code we emailed to verify your address."}
          </p>
        </div>

        {!details ? (
          <Form key="details" {...detailsForm}>
            <form
              className="space-y-4"
              onSubmit={detailsForm.handleSubmit(handleSendCode)}
            >
              <FormField
                control={detailsForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-brand">
                      Full name
                    </FormLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John Doe"
                          className="h-10 xl:h-12 pl-10 bg-card border-border focus-visible:border-primary rounded-lg transition-colors"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={detailsForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-brand">
                      Email address
                    </FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="you@example.com"
                          className="h-10 xl:h-12 pl-10 bg-card border-border focus-visible:border-primary rounded-lg transition-colors"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                disabled={detailsForm.formState.isSubmitting}
                type="submit"
                className="w-full h-10 xl:h-12 text-sm xl:text-base font-semibold rounded-lg transition-colors shadow-sm"
              >
                {detailsForm.formState.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" className="text-current" />
                    <span>Sending code...</span>
                  </div>
                ) : (
                  "Send verification code"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                We email a code to confirm the address, then you choose a
                password.
              </p>

              <div className="text-center text-sm text-muted-foreground pt-1">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Sign in instead.
                </Link>
              </div>
            </form>
          </Form>
        ) : !signupContext ? (
          <Form key="code" {...codeForm}>
            <form
              className="space-y-4"
              onSubmit={codeForm.handleSubmit(handleVerifyCode)}
            >
              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="items-center">
                    <FormLabel className="text-sm font-semibold text-brand">
                      Verification code
                    </FormLabel>
                    <FormControl>
                      <InputOTP
                        {...field}
                        maxLength={6}
                        containerClassName="justify-center"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                disabled={codeForm.formState.isSubmitting}
                type="submit"
                className="w-full h-10 xl:h-12 text-sm xl:text-base font-semibold rounded-lg transition-colors shadow-sm"
              >
                {codeForm.formState.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" className="text-current" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify email"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                We sent a 6-digit code to {details.email}.
              </p>

              <div className="text-center text-sm text-muted-foreground pt-1">
                <button
                  type="button"
                  onClick={() => setDetails(null)}
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Use a different email.
                </button>
              </div>
            </form>
          </Form>
        ) : (
          <Form key="password" {...passwordForm}>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(handleCreateAccount)}
            >
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-brand">
                      Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        className="h-10 xl:h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-brand">
                      Confirm password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        className="h-10 xl:h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                disabled={passwordForm.formState.isSubmitting}
                type="submit"
                className="w-full h-10 xl:h-12 text-sm xl:text-base font-semibold rounded-lg transition-colors shadow-sm"
              >
                {passwordForm.formState.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" className="text-current" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create account"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                At least 12 characters. You can add a passkey later so sign-in
                needs no password at all.
              </p>
            </form>
          </Form>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{" "}
        <a
          href={TERMS_URL}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
        >
          Privacy Policy
        </a>
        .
      </div>
    </AuthPanel>
  );
}
