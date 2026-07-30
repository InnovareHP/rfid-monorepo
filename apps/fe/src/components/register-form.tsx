import { authClient } from "@/lib/auth-client";
import {
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
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@tanstack/react-router";
import { Fingerprint, KeyRound, Loader2, Mail, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";

const detailsSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const codeSchema = z.object({
  code: z.string().length(6),
});

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useRouter();
  const [details, setDetails] = useState<z.infer<typeof detailsSchema> | null>(
    null
  );

  const detailsForm = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", email: "" },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
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

  // The code buys an enrollment grant, never a session — the passkey ceremony
  // is what creates the account.
  const handleVerifyAndEnroll = async (values: z.infer<typeof codeSchema>) => {
    if (!details) return;

    try {
      const grant = await verifySignupOtp(
        details.email,
        details.name,
        values.code
      );

      const { error } = await authClient.passkey.addPasskey({
        context: grant.context,
      });
      if (error) {
        toast.error(error.message ?? "Could not register your passkey.");
        return;
      }

      const { error: signInError } = await authClient.signIn.passkey();
      if (signInError) {
        toast.success("Account created. Sign in with your new passkey.");
        await navigate.navigate({ to: "/login", replace: true });
        return;
      }

      await navigate.navigate({ to: "/onboarding", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "That code is invalid or has expired."
      );
    }
  };

  return (
    <div
      className={cn(
        "[--panelw:clamp(26rem,30vw,34rem)] [--gapw:1rem] xl:[--gapw:1.5rem] [--framew:2rem] xl:[--framew:3rem] p-0 lg:p-4 xl:p-6",
        className
      )}
      {...props}
    >
      <div className="flex items-stretch justify-center w-full mx-auto max-w-[96rem] lg:gap-[var(--gapw)] lg:h-[min(calc(100svh-var(--framew)),calc((100vw-var(--panelw)-var(--gapw)-var(--framew))*1.183),64rem)]">
        {/* Left Side - Design image */}
        <div className="hidden lg:block h-full aspect-[1300/1538] shrink-0 overflow-hidden rounded-3xl shadow-xl">
          <img
            src="/login-page/Inner.png"
            alt="See every referral. Track every opportunity."
            className="h-full w-full object-cover"
          />
        </div>

        {/* Right Side - Register Panel */}
        <div className="w-full lg:w-[var(--panelw)] lg:shrink-0 min-h-svh lg:min-h-0 lg:h-full lg:overflow-y-auto rounded-none lg:rounded-3xl shadow-none lg:shadow-xl bg-gradient-to-b from-blue-900 via-blue-600 to-sky-300 lg:bg-gradient-to-br lg:from-sky-200 lg:via-blue-100 lg:to-blue-200 flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8 lg:gap-6 lg:p-6 xl:p-8">
          <img
            src="/login-page/Refidly%20[Full]%20-%20White%201.png"
            alt="Refidly — See it. Track it. Move it."
            className="w-36 sm:w-44 lg:hidden"
          />
          <div className="w-full max-w-md lg:max-w-none rounded-2xl bg-gradient-to-b from-white to-blue-50 shadow-lg p-6 sm:p-8 lg:p-7 xl:p-9">
            <div className="space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-3xl xl:text-4xl font-bold text-blue-900 lg:whitespace-nowrap">
                  Create account
                </h2>
                <p className="text-sm xl:text-base text-gray-600">
                  {details
                    ? "Enter the code we emailed, then register your passkey."
                    : "Sign up to get started with your free account."}
                </p>
              </div>

              {!details ? (
                <Form {...detailsForm}>
                  <form
                    className="space-y-4"
                    onSubmit={detailsForm.handleSubmit(handleSendCode)}
                  >
                    <FormField
                      control={detailsForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-blue-900">
                            Full name
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="John Doe"
                                className="h-10 xl:h-12 pl-10 bg-white border-gray-200 focus-visible:border-blue-600 rounded-lg transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-blue-900">
                            Email address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="you@example.com"
                                className="h-10 xl:h-12 pl-10 bg-white border-gray-200 focus-visible:border-blue-600 rounded-lg transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      disabled={detailsForm.formState.isSubmitting}
                      type="submit"
                      className="w-full h-10 xl:h-12 text-sm xl:text-base bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      {detailsForm.formState.isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending code...</span>
                        </div>
                      ) : (
                        "Send verification code"
                      )}
                    </Button>

                    <p className="text-center text-xs text-gray-500">
                      No password is created. Your account is protected by a
                      passkey bound to this device.
                    </p>

                    <div className="text-center text-sm text-gray-600 pt-1">
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Sign in instead.
                      </Link>
                    </div>
                  </form>
                </Form>
              ) : (
                <Form {...codeForm}>
                  <form
                    className="space-y-4"
                    onSubmit={codeForm.handleSubmit(handleVerifyAndEnroll)}
                  >
                    <FormField
                      control={codeForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-blue-900">
                            Verification code
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                {...field}
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="123456"
                                className="h-10 xl:h-12 pl-10 bg-white border-gray-200 focus-visible:border-blue-600 rounded-lg transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      disabled={codeForm.formState.isSubmitting}
                      type="submit"
                      className="w-full h-10 xl:h-12 text-sm xl:text-base bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      {codeForm.formState.isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating account...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 xl:w-5 xl:h-5" />
                          <span>Create passkey</span>
                        </div>
                      )}
                    </Button>

                    <p className="text-center text-xs text-gray-500">
                      Your passkey stays on this device and is unlocked with
                      your fingerprint, face, or device PIN.
                    </p>

                    <div className="text-center text-sm text-gray-600 pt-1">
                      <button
                        type="button"
                        onClick={() => setDetails(null)}
                        className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Use a different email.
                      </button>
                    </div>
                  </form>
                </Form>
              )}
            </div>

            <div className="mt-6 text-center text-xs text-gray-500">
              By creating an account, you agree to our{" "}
              <a
                href="#"
                className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
