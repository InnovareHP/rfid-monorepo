import { authClient } from "@/lib/auth-client";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
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
      <form
        onSubmit={passwordForm.handleSubmit((values) =>
          changePasswordMutation.mutate(values)
        )}
        className="space-y-4 border-t border-gray-200 pt-4"
      >
        <div className="space-y-2">
          <Label htmlFor="currentPassword">
            Current Password <span className="text-red-500">*</span>
          </Label>
          <Input
            id="currentPassword"
            type="password"
            {...passwordForm.register("currentPassword")}
          />
          <p className="text-xs text-red-600">
            {passwordForm.formState.errors.currentPassword?.message}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              New Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="newPassword"
              type="password"
              {...passwordForm.register("newPassword")}
            />
            <p className="text-xs text-red-600">
              {passwordForm.formState.errors.newPassword?.message}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              {...passwordForm.register("confirmPassword")}
            />
            <p className="text-xs text-red-600">
              {passwordForm.formState.errors.confirmPassword?.message}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="revokeOtherSessions"
            checked={passwordForm.watch("revokeOtherSessions")}
            onCheckedChange={(checked) =>
              passwordForm.setValue("revokeOtherSessions", checked === true)
            }
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="revokeOtherSessions" className="font-semibold">
              Sign out other devices
            </Label>
            <p className="text-xs text-muted-foreground">
              Ends all other active sessions except this one when you update
              your password.
            </p>
          </div>
        </div>

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
    </SectionCard>
  );
}
