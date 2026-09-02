import { authClient, refreshSessionCache } from "@/lib/auth-client";
import { uploadImage } from "@/services/image/image-service";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Separator } from "@dashboard/ui/components/separator";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import type { User as BetterAuthUser } from "better-auth";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle,
  Loader2,
  LogOut,
  Mail,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function AccountPage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { user, session } = useRouteContext({ from: "__root__" }) as {
    user: BetterAuthUser & { role?: string };
    session?: { createdAt?: string | Date };
  };

  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { image?: string; name?: string }) => {
      return authClient.updateUser(data);
    },
    onSuccess: async () => {
      await refreshSessionCache();
      await router.invalidate();
      toast.success("Profile updated successfully!");
    },
    onError: (error: unknown) => {
      const message =
        (error as { error?: { message?: string } })?.error?.message ??
        "Failed to update profile";
      toast.error(message);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) =>
      authClient.changePassword(
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        {}
      ),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      passwordForm.reset();
      setShowPasswordForm(false);
      router.invalidate();
    },
    onError: (error: unknown) => {
      const message =
        (error as { error?: { message?: string } })?.error?.message ??
        "Failed to change password";
      toast.error(message);
    },
    onSettled: () => {
      setIsChangingPassword(false);
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const data = await uploadImage(file, "public");
      if (!data?.url) throw new Error("Upload failed");

      updateUserMutation.mutate({ image: data.url });
    } catch {
      toast.error("Failed to upload profile picture.");
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePasswordSubmit = (values: PasswordFormValues) => {
    try {
      setIsChangingPassword(true);
      changePasswordMutation.mutate(values);
    } catch {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      queryClient.clear();
      toast.success("Signed out successfully");
      router.invalidate();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-muted via-primary/5 to-muted flex items-center justify-center p-4">
        <div className="bg-card border-2 border-destructive/20 rounded-lg p-8 text-center max-w-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-destructive">
                Error Loading Account
              </h3>
              <p className="text-destructive mt-1">Could not load your account.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please try refreshing the page or contact support if the problem
                persists.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const memberSinceDate =
    (session?.createdAt && new Date(session.createdAt)) ||
    (user.createdAt && new Date(user.createdAt));

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-gradient-to-br from-muted via-primary/5 to-muted",
        className
      )}
      {...props}
    >
      <div className="sticky top-0 z-40 border-b-2 border-primary/20 bg-card shadow-md">
        <div className="max-w-[1920px] mx-auto p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-brand-rail-mid to-brand-rail-via flex items-center justify-center shadow-lg">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-brand-rail-foreground" />
            </div>
            <div>
              <h1 className="page-title text-2xl sm:text-3xl font-bold tracking-tight">
                Profile Settings
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage your account details and security
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2 border-2 border-border shadow-sm">
            <CardHeader className="border-b-2 border-border bg-primary/10">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-primary">
                    Profile Information
                  </CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="relative">
                  <div
                    className="relative cursor-pointer group"
                    onClick={handleAvatarClick}
                  >
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 border-4 border-primary/20 shadow-lg transition-all hover:border-primary/20 hover:shadow-xl">
                      {user.image ? (
                        <AvatarImage
                          src={`${user.image}?t=${Date.now()}`}
                          alt={user.name ?? "User"}
                        />
                      ) : (
                        <AvatarFallback className="bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                          {user.name?.charAt(0).toUpperCase() ||
                            user.email?.charAt(0).toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <Camera className="h-7 w-7 sm:h-8 sm:w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {isUploading && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                        <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    {user.name || "No name set"}
                  </h3>
                  <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1 break-all">
                    <Mail className="w-4 h-4 text-primary" />
                    {user.email}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 sm:mt-4 border-primary/20 hover:bg-primary/10"
                    onClick={handleAvatarClick}
                    disabled={isUploading || updateUserMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>
              </div>

              <Separator className="bg-muted-foreground" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-primary">
                      Email Address
                    </p>
                  </div>
                  <p className="font-semibold text-foreground break-all">
                    {user.email}
                  </p>
                </div>

                {user.emailVerified && (
                  <div className="bg-success/10 border-2 border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <p className="text-sm font-medium text-success">
                        Email Status
                      </p>
                    </div>
                    <Badge className="bg-success/10 text-success border-2 border-success/20 font-semibold">
                      Verified
                    </Badge>
                  </div>
                )}

                {memberSinceDate &&
                  !Number.isNaN(memberSinceDate.getTime()) && (
                    <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-primary">
                          Member Since
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {memberSinceDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}

                {user.role && (
                  <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-primary">Role</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-2 border-primary/20 font-semibold capitalize">
                      {user.role}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border shadow-sm">
            <CardHeader className="border-b-2 border-border bg-primary/10">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-primary">
                    Account Actions
                  </CardTitle>
                  <CardDescription>
                    Security and account management
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4 sm:p-6">
              <Button
                variant="outline"
                className="w-full justify-start border-primary/20 hover:bg-primary/10"
                onClick={() => setShowPasswordForm((prev) => !prev)}
                disabled={
                  isChangingPassword || changePasswordMutation.isPending
                }
              >
                <Shield className="w-4 h-4 mr-2" />
                {showPasswordForm ? "Cancel" : "Change Password"}
              </Button>

              {showPasswordForm && (
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                    className="space-y-4 border-2 border-primary/20 rounded-lg p-4 bg-primary/10"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-primary font-medium">
                            Current Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              className="border-primary/20 focus:ring-2 focus:ring-ring"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-primary font-medium">
                            New Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              className="border-primary/20 focus:ring-2 focus:ring-ring"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      className="w-full bg-primary hover:bg-primary"
                      type="submit"
                      disabled={
                        isChangingPassword || changePasswordMutation.isPending
                      }
                    >
                      {isChangingPassword ||
                      changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              <Separator className="bg-muted-foreground" />

              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
