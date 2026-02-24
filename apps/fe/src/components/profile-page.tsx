import { authClient } from "@/lib/auth-client";
import { useTeamLayoutContext } from "@/routes/_team";
import { uploadImage } from "@/services/image/image-service";
import {
  disconnectGmail,
  disconnectOutlook,
  getGmailAuthUrl,
  getGmailStatus,
  getOutlookAuthUrl,
  getOutlookStatus,
} from "@/services/lead/lead-service";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle,
  Link,
  Loader2,
  LogOut,
  Mail,
  Shield,
  Unlink,
  Upload,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ProfilePage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { user, memberData } = useTeamLayoutContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as Record<string, string>;

  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- Gmail connection ----

  const gmailStatusQuery = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const connectGmailMutation = useMutation({
    mutationFn: getGmailAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to start Gmail connection");
    },
  });

  const disconnectGmailMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      toast.success("Gmail disconnected successfully");
    },
    onError: () => {
      toast.error("Failed to disconnect Gmail");
    },
  });

  // Show toast on redirect back from Gmail OAuth
  useEffect(() => {
    if (search?.gmail === "connected") {
      toast.success("Gmail connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
    } else if (search?.gmail === "error") {
      toast.error(search?.message || "Failed to connect Gmail");
    }
  }, []);

  // ---- Outlook connection ----

  const outlookStatusQuery = useQuery({
    queryKey: ["outlook-status"],
    queryFn: getOutlookStatus,
  });

  const connectOutlookMutation = useMutation({
    mutationFn: getOutlookAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to start Outlook connection");
    },
  });

  const disconnectOutlookMutation = useMutation({
    mutationFn: disconnectOutlook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlook-status"] });
      toast.success("Outlook disconnected successfully");
    },
    onError: () => {
      toast.error("Failed to disconnect Outlook");
    },
  });

  // Show toast on redirect back from Outlook OAuth
  useEffect(() => {
    if (search?.outlook === "connected") {
      toast.success("Outlook connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["outlook-status"] });
    } else if (search?.outlook === "error") {
      toast.error(search?.message || "Failed to connect Outlook");
    }
  }, []);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  /* ---------------- PROFILE IMAGE UPLOAD ---------------- */

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
          onError: (error) => {
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

  /* ---------------- CHANGE PASSWORD ---------------- */

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
          onError: (error) => {
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

  /* ---------------- SIGN OUT ---------------- */

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.navigate({ to: "/login" });
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  /* ---------------- ERROR STATE ---------------- */

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 flex items-center justify-center p-4">
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
        "min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 border-b-2 border-blue-200 bg-white shadow-md">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
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
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-blue-900">
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
                    <Avatar className="h-32 w-32 border-4 border-blue-200 shadow-lg transition-all hover:border-blue-400 hover:shadow-xl">
                      {user?.image ? (
                        <AvatarImage
                          src={`${user.image}?t=${Date.now()}`}
                          alt={user.name ?? "User"}
                        />
                      ) : (
                        <AvatarFallback className="bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
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
                    <Mail className="w-4 h-4 text-blue-600" />
                    {user?.email}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-blue-300 hover:bg-blue-50"
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
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">
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
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-900">
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
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-900">Role</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-2 border-blue-300 font-semibold capitalize">
                      {memberData.role}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ---------------- ACCOUNT ACTIONS ---------------- */}
          <Card className="border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-blue-900">
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
                className="w-full justify-start border-blue-300 hover:bg-blue-50"
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
                  className="space-y-4 border-2 border-blue-200 rounded-lg p-4 bg-blue-50"
                >
                  <div className="space-y-2">
                    <Label className="text-blue-900 font-medium">
                      Current Password
                    </Label>
                    <Input
                      type="password"
                      className="border-blue-300 focus:ring-2 focus:ring-blue-500"
                      {...passwordForm.register("currentPassword")}
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-red-600 font-medium">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-blue-900 font-medium">
                      New Password
                    </Label>
                    <Input
                      type="password"
                      className="border-blue-300 focus:ring-2 focus:ring-blue-500"
                      {...passwordForm.register("newPassword")}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-red-600 font-medium">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
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

          {/* ---------------- CONNECTED ACCOUNTS ---------------- */}
          <Card className="lg:col-span-3 border-2 border-gray-300 shadow-sm">
            <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
              <div className="flex items-center gap-2">
                <Link className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-blue-900">
                    Connected Accounts
                  </CardTitle>
                  <CardDescription>
                    Connect external accounts to enhance your workflow
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Gmail */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-red-50 border-2 border-red-200 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Gmail</p>
                    {gmailStatusQuery.data?.connected ? (
                      <p className="text-sm text-gray-600">
                        Connected as{" "}
                        <span className="font-medium text-blue-600">
                          {gmailStatusQuery.data.email}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Send activity emails from your Gmail account
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {gmailStatusQuery.data?.connected && (
                    <Badge className="bg-green-100 text-green-700 border-2 border-green-300 font-semibold">
                      Connected
                    </Badge>
                  )}

                  {gmailStatusQuery.data?.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => disconnectGmailMutation.mutate()}
                      disabled={disconnectGmailMutation.isPending}
                    >
                      {disconnectGmailMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-1" />
                      )}
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 hover:bg-blue-50"
                      onClick={() => connectGmailMutation.mutate()}
                      disabled={
                        connectGmailMutation.isPending ||
                        gmailStatusQuery.isLoading
                      }
                    >
                      {connectGmailMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4 mr-1" />
                      )}
                      Connect Gmail
                    </Button>
                  )}
                </div>
              </div>

              <Separator className="bg-gray-300" />

              {/* Outlook */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Outlook</p>
                    {outlookStatusQuery.data?.connected ? (
                      <p className="text-sm text-gray-600">
                        Connected as{" "}
                        <span className="font-medium text-blue-600">
                          {outlookStatusQuery.data.email}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Send activity emails from your Outlook account
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {outlookStatusQuery.data?.connected && (
                    <Badge className="bg-green-100 text-green-700 border-2 border-green-300 font-semibold">
                      Connected
                    </Badge>
                  )}

                  {outlookStatusQuery.data?.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => disconnectOutlookMutation.mutate()}
                      disabled={disconnectOutlookMutation.isPending}
                    >
                      {disconnectOutlookMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-1" />
                      )}
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 hover:bg-blue-50"
                      onClick={() => connectOutlookMutation.mutate()}
                      disabled={
                        connectOutlookMutation.isPending ||
                        outlookStatusQuery.isLoading
                      }
                    >
                      {connectOutlookMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4 mr-1" />
                      )}
                      Connect Outlook
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
