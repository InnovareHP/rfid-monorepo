import { authClient } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
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
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v3";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleResetPassword = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password/verify`,
      });

      if (error) {
        return toast.error(error.message);
      }

      toast.success("Password reset email sent successfully");
    } catch (error) {
      toast.error("Failed to send password reset email");
    }
  };

  return (
    <div
      className={cn("flex items-center justify-center gap-0 p-4", className)}
      {...props}
    >
      <div className="flex items-stretch w-full max-w-6xl overflow-hidden rounded-2xl shadow-xl">
        {/* Left Side - Image background + text */}
        <div className="hidden lg:block relative lg:w-3/5 min-h-[28rem]">
          <div
            className="absolute inset-0 bg-cover bg-center brightness-95"
            style={{ backgroundImage: "url(/login-page/login-img-2.jpg)" }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/75"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col justify-center h-full p-10 text-white">
            <div className="flex flex-col gap-0 space-y-10 [text-shadow:_0_1px_2px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col gap-0">
                <img
                  src="/login-page/rfid.png"
                  alt="Innovare HP Referral Intelligence"
                  className="w-full h-auto object-contain max-h-52 invert brightness-0 drop-shadow-md"
                />
                <div className="space-y-6 mt-4">
                  <p className="text-xl text-white leading-relaxed">
                    Don't worry! It happens. We'll help you get back on track.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 flex-shrink-0">
                    <Mail className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">
                      Check Your Email
                    </h3>
                    <p className="text-white/95 leading-relaxed">
                      We'll send you a secure link to reset your password
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 flex-shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">
                      Quick & Easy
                    </h3>
                    <p className="text-white/95 leading-relaxed">
                      Reset your password in just a few simple steps
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-2/5">
          <Card className="border-2 border-l-0 lg:border-l-2 shadow-none rounded-none lg:rounded-r-2xl h-full">
            <CardContent className="p-8">
              <Form {...form}>
                <form
                  className="space-y-6"
                  onSubmit={form.handleSubmit(handleResetPassword)}
                >
                  <div className="space-y-2 text-center">
                    <img
                      src="/login-page/tarsier.png"
                      alt=""
                      className="w-16 h-16 mx-auto mb-4 object-contain"
                    />
                    <h2 className="text-3xl font-bold text-gray-900">
                      Forgot Password?
                    </h2>
                    <p className="text-gray-600">
                      Enter your email address and we'll send you a reset link
                    </p>
                  </div>

                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="you@example.com"
                                className="h-12 pl-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-colors"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      disabled={form.formState.isSubmitting}
                      type="submit"
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm mt-2"
                    >
                      {form.formState.isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending reset link...</span>
                        </div>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>

                    <div className="text-center text-sm text-gray-600 pt-4">
                      <Link
                        to="/"
                        className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Sign In
                      </Link>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          <div className="mt-6 text-center text-xs text-gray-500 px-4">
            Need help?{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
