import { authClient } from "@/lib/auth-client";
import { TwoFactorSettings } from "@/components/two-factor/two-factor-settings";
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
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Separator } from "@dashboard/ui/components/separator";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
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

interface RouteContext {
  user: BetterAuthUser & { role?: string };
  memberData: Member & { createdAt?: string | Date; role?: string };
}
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ProfilePage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { user, memberData } = useRouteContext({
    from: "__root__",
  }) as RouteContext;

  const router = useRouter();

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

      const data = await uploadImage(file);
      if (!data?.url) throw new Error("Upload failed");

      await authClient.updateUser(
        { image: data.url },
        {
          onSuccess: () => {
            toast.success("Profile picture updated!");
          },
          onError: (error: any) => {
            toast.error(error.error.message);
          },
        }
      );

      router.invalidate();
    } catch (error) {
      toast.error("Failed to upload profile picture.");
    } finally {
      setIsUploading(false);

      // ✅ reset input so same file can be reselected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    try {
      setIsChangingPassword(true);

      await authClient.changePassword(
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        {
          onSuccess: () => {
            toast.success("Password changed successfully!");
            passwordForm.reset();
            setShowPasswordForm(false);
          },
          onError: (error: any) => {
            toast.error(error.error.message);
          },
        }
      );

      toast.success("Password changed successfully!");
      router.invalidate();
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.navigate({ to: "/login" });
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-primary/5 to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border-2 border-red-200 rounded-lg p-8 text-center max-w-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Error Loading Profile
              </h3>
              <p className="text-red-700 mt-1">Could not load user profile.</p>
              <p className="text-sm text-gray-600 mt-2">
                Please try refreshing the page or contact support if the problem
                persists.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-gradient-to-br from-gray-50 via-primary/5 to-gray-50",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 border-b-2 border-primary/30 bg-white shadow-md">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Profile Settings
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage your account, profile image, and security
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---------------- PROFILE CARD ---------------- */}
          <Card className="lg:col-span-2 border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-primary/10">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-foreground">
                    Profile Information
                  </CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative">
                  <div
                    className="relative cursor-pointer group"
                    onClick={handleAvatarClick}
                  >
                    <Avatar className="h-32 w-32 border-4 border-primary/30 shadow-lg transition-all hover:border-primary/50 hover:shadow-xl">
                      {user?.image ? (
                        <AvatarImage
                          src={`${user.image}?t=${Date.now()}`}
                          alt={user.name ?? "User"}
                        />
                      ) : (
                        <AvatarFallback className="bg-primary/15 flex items-center justify-center text-primary text-2xl font-bold">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {/* Camera overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {isUploading && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
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
                  <h3 className="text-2xl font-bold text-gray-900">
                    {user?.name || "No name set"}
                  </h3>
                  <p className="text-gray-600 flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <Mail className="w-4 h-4 text-primary" />
                    {user?.email}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-primary/40 hover:bg-primary/10"
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>
              </div>

              <Separator className="bg-gray-300" />

              {/* Account Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Email Address
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">{user?.email}</p>
                </div>

                {user?.emailVerified && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-900">
                        Email Status
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-2 border-green-300 font-semibold">
                      Verified
                    </Badge>
                  </div>
                )}

                {memberData?.createdAt && (
                  <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">
                        Member Since
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {new Date(memberData.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                )}

                {memberData?.role && (
                  <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Role</p>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-2 border-primary/40 font-semibold capitalize">
                      {memberData.role}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ---------------- ACCOUNT ACTIONS ---------------- */}
          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-primary/10">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-foreground">
                    Account Actions
                  </CardTitle>
                  <CardDescription>
                    Security and account management
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              {/* Change Password Button */}
              <Button
                variant="outline"
                className="w-full justify-start border-primary/40 hover:bg-primary/10"
                onClick={() => setShowPasswordForm((prev) => !prev)}
                disabled={isChangingPassword}
              >
                <Shield className="w-4 h-4 mr-2" />
                {showPasswordForm ? "Cancel" : "Change Password"}
              </Button>

              {/* Password Form */}
              {showPasswordForm && (
                <form
                  onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                  className="space-y-4 border-2 border-primary/30 rounded-lg p-4 bg-primary/10"
                >
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">
                      Current Password
                    </Label>
                    <Input
                      type="password"
                      className="border-primary/40 focus:ring-2 focus:ring-primary"
                      {...passwordForm.register("currentPassword")}
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-red-600 font-medium">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">
                      New Password
                    </Label>
                    <Input
                      type="password"
                      className="border-primary/40 focus:ring-2 focus:ring-primary"
                      {...passwordForm.register("newPassword")}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-red-600 font-medium">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    type="submit"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
              )}

              <Separator className="bg-gray-300" />

              {/* Two-Factor Authentication */}
              <TwoFactorSettings
                enabled={
                  (user as BetterAuthUser & { twoFactorEnabled?: boolean })
                    .twoFactorEnabled === true
                }
              />

              <Separator className="bg-gray-300" />

              {/* Sign Out Button */}
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
