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
import { Spinner } from "@dashboard/ui/components/spinner";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import z from "zod/v3";

export function OtpForm({ className, ...props }: React.ComponentProps<"div">) {
  const formSchema = z.object({
    otp: z
      .string()
      .min(6, "Please enter the 6-digit code")
      .max(6, "Please enter the 6-digit code"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Stub: this screen is routed but never wired to a verification endpoint.
  const handleVerifyOtp = async (_values: z.infer<typeof formSchema>) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch {
      // No verification call to fail yet.
    }
  };

  const handleResendOtp = () => {};

  return (
    <div
      className={cn("flex items-center justify-center p-4", className)}
      {...props}
    >
      <div className="w-full max-w-md">
        <Card className="overflow-hidden shadow-xl border-0 bg-card/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <Form {...form}>
              <form
                className="space-y-5"
                onSubmit={form.handleSubmit(handleVerifyOtp)}
              >
                <div className="space-y-2 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Verify Your Account
                  </h1>
                  <p className="text-muted-foreground">
                    We've sent a 6-digit verification code to your email address
                  </p>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          Verification Code
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="Enter 6-digit code"
                              className="h-10 pl-10 border-border focus:border-primary focus:ring-primary/20 transition-all duration-200 text-center text-lg tracking-widest"
                              maxLength={6}
                              onChange={(e) => {
                                // Only allow numbers
                                const value = e.target.value.replace(/\D/g, "");
                                field.onChange(value);
                              }}
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
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl cursor-pointer"
                  >
                    {form.formState.isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <Spinner size="sm" className="text-current" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Didn't receive the code?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResendOtp}
                      className="text-sm text-primary hover:text-primary dark:text-primary dark:hover:text-primary border-primary/30 dark:border-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200"
                    >
                      Resend Code
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    <Link
                      to="/"
                      className="font-medium text-primary hover:text-primary dark:text-primary dark:hover:text-primary transition-colors duration-200 inline-flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to Sign In
                    </Link>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <a
            href="#"
            className="text-primary hover:text-primary dark:text-primary dark:hover:text-primary underline underline-offset-4 transition-colors duration-200"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="text-primary hover:text-primary dark:text-primary dark:hover:text-primary underline underline-offset-4 transition-colors duration-200"
          >
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}
