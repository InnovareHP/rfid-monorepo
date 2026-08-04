import { authClient } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SectionCard } from "./section-card";

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
    revokeOtherSessions: z.boolean(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof PasswordSchema>;

export function ChangePasswordCard() {
  const queryClient = useQueryClient();

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: false,
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordValues) => {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      });
      if (error) throw new Error(error.message ?? "Failed to update password");
    },
    onSuccess: () => {
      toast.success("Password updated");
      passwordForm.reset();
      queryClient.invalidateQueries({ queryKey: ["profile-sessions"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <SectionCard
      title="Change Password"
      description="Use a strong, unique password you don't use elsewhere."
    >
      <Form {...passwordForm}>
        <form
          onSubmit={passwordForm.handleSubmit((values) =>
            changePasswordMutation.mutate(values)
          )}
          className="space-y-4 border-t border-gray-200 pt-4"
        >
          <FormField
            control={passwordForm.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Current Password <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    New Password <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                  <FormLabel>
                    Confirm Password <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={passwordForm.control}
            name="revokeOtherSessions"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="mt-0.5"
                  />
                </FormControl>
                <div>
                  <FormLabel className="font-semibold">
                    Sign out other devices
                  </FormLabel>
                  <FormDescription className="text-xs">
                    Ends all other active sessions except this one when you
                    update your password.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-start">
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="w-full bg-brand text-white hover:bg-brand/90 sm:w-auto"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Update Password
            </Button>
          </div>
        </form>
      </Form>
    </SectionCard>
  );
}
