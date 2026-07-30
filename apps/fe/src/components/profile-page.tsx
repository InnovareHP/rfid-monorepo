import { PasskeysCard } from "@/components/passkeys/passkeys-card";
import { TwoFactorSettings } from "@/components/two-factor/two-factor-settings";
import { authClient } from "@/lib/auth-client";
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
import { Separator } from "@dashboard/ui/components/separator";
import { cn } from "@dashboard/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import type { User as BetterAuthUser } from "better-auth";
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  Laptop,
  Loader2,
  LogOut,
  Mail,
  MonitorSmartphone,
  Pencil,
  Shield,
  ShieldCheck,
  Upload,
  User,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type SessionRow = {
  id: string;
  token: string;
  createdAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

interface RouteContext {
  user: BetterAuthUser & {
    role?: string;
    twoFactorEnabled?: boolean;
    createdAt?: string | Date;
  };
  memberData: Member & { createdAt?: string | Date; role?: string };
}

function describeUserAgent(userAgent?: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = /edg/i.test(userAgent)
    ? "Edge"
    : /chrome|crios/i.test(userAgent)
      ? "Chrome"
      : /firefox|fxios/i.test(userAgent)
        ? "Firefox"
        : /safari/i.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /windows/i.test(userAgent)
    ? "Windows"
    : /iphone|ipad/i.test(userAgent)
      ? "iOS"
      : /android/i.test(userAgent)
        ? "Android"
        : /mac os/i.test(userAgent)
          ? "macOS"
          : /linux/i.test(userAgent)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${os}`;
}

function InfoTile({
  icon: Icon,
  label,
  children,
  tone = "primary",
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
  tone?: "primary" | "green" | "amber";
}) {
  const tones = {
    primary: "bg-primary/10 border-primary/30",
    green: "bg-green-50 border-green-200",
    amber: "bg-amber-50 border-amber-200",
  };
  const iconTones = {
    primary: "text-primary",
    green: "text-green-600",
    amber: "text-amber-600",
  };
  return (
    <div className={cn("border-2 rounded-lg p-4", tones[tone])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", iconTones[tone])} />
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      {children}
    </div>
  );
}

export function ProfilePage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { user, memberData } = useRouteContext({
    from: "__root__",
  }) as RouteContext;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessionData } = authClient.useSession();

  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.name ?? "");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["profile-sessions"],
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error) throw new Error(error.message ?? "Failed to load sessions");
      return data ?? [];
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authClient.revokeSession({ token });
      if (error) throw new Error(error.message ?? "Failed to revoke session");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-sessions"] });
      toast.success("Session revoked");
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error(error.message ?? "Failed to revoke sessions");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-sessions"] });
      toast.success("Signed out of all other devices");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message ?? "Failed to update name");
    },
    onSuccess: () => {
      toast.success("Name updated");
      setIsEditingName(false);
      router.invalidate();
    },
    onError: (error) => toast.error(error.message),
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

      const { error } = await authClient.updateUser({ image: data.url });
      if (error) throw new Error(error.message ?? "Update failed");

      toast.success("Profile picture updated!");
      router.invalidate();
    } catch {
      toast.error("Failed to upload profile picture.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      router.navigate({ to: "/login" });
    } catch {
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

  const currentSessionToken = sessionData?.session?.token;
  const twoFactorEnabled = user.twoFactorEnabled === true;
  const formatDate = (value: string | Date) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

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
              <h1 className="text-3xl font-bold tracking-tight page-title">
                Profile Settings
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage your account, security, and active sessions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* ---------------- PROFILE CARD ---------------- */}
            <Card className="border-2 border-gray-300 shadow-sm">
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
                    {isEditingName ? (
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <Input
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          className="max-w-64 text-lg font-semibold"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-9 w-9 p-0 bg-primary hover:bg-primary/90"
                          disabled={
                            !nameDraft.trim() || updateNameMutation.isPending
                          }
                          onClick={() =>
                            updateNameMutation.mutate(nameDraft.trim())
                          }
                          aria-label="Save name"
                        >
                          {updateNameMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0"
                          onClick={() => {
                            setNameDraft(user?.name ?? "");
                            setIsEditingName(false);
                          }}
                          aria-label="Cancel editing name"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {user?.name || "No name set"}
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-primary"
                          onClick={() => setIsEditingName(true)}
                          aria-label="Edit name"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoTile
                    icon={CheckCircle}
                    label="Email Status"
                    tone={user?.emailVerified ? "green" : "amber"}
                  >
                    <Badge
                      className={
                        user?.emailVerified
                          ? "bg-green-100 text-green-700 border-2 border-green-300 font-semibold"
                          : "bg-amber-100 text-amber-700 border-2 border-amber-300 font-semibold"
                      }
                    >
                      {user?.emailVerified ? "Verified" : "Not Verified"}
                    </Badge>
                  </InfoTile>

                  <InfoTile
                    icon={ShieldCheck}
                    label="Two-Factor Authentication"
                    tone={twoFactorEnabled ? "green" : "amber"}
                  >
                    <Badge
                      className={
                        twoFactorEnabled
                          ? "bg-green-100 text-green-700 border-2 border-green-300 font-semibold"
                          : "bg-amber-100 text-amber-700 border-2 border-amber-300 font-semibold"
                      }
                    >
                      {twoFactorEnabled ? "Enabled" : "Not Enabled"}
                    </Badge>
                  </InfoTile>

                  {memberData?.role && (
                    <InfoTile icon={Shield} label="Role">
                      <Badge className="bg-primary/15 text-primary border-2 border-primary/40 font-semibold capitalize">
                        {memberData.role.replace(/_/g, " ")}
                      </Badge>
                    </InfoTile>
                  )}

                  {memberData?.createdAt && (
                    <InfoTile icon={Calendar} label="Member Since">
                      <p className="font-semibold text-gray-900">
                        {formatDate(memberData.createdAt)}
                      </p>
                    </InfoTile>
                  )}

                  {user?.createdAt && (
                    <InfoTile icon={User} label="Account Created">
                      <p className="font-semibold text-gray-900">
                        {formatDate(user.createdAt)}
                      </p>
                    </InfoTile>
                  )}

                  <InfoTile icon={MonitorSmartphone} label="Active Sessions">
                    <p className="font-semibold text-gray-900">
                      {sessionsQuery.data?.length ?? "—"}
                    </p>
                  </InfoTile>
                </div>
              </CardContent>
            </Card>

            {/* ---------------- SESSIONS CARD ---------------- */}
            <Card className="border-2 border-gray-300 shadow-sm">
              <CardHeader className="border-b-2 border-gray-300 bg-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-foreground">
                        Active Sessions
                      </CardTitle>
                      <CardDescription>
                        Devices currently signed in to your account
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    disabled={
                      revokeOthersMutation.isPending ||
                      (sessionsQuery.data?.length ?? 0) <= 1
                    }
                    onClick={() => revokeOthersMutation.mutate()}
                  >
                    {revokeOthersMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Sign out other devices
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {sessionsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading sessions...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(sessionsQuery.data ?? []).map((session: SessionRow) => {
                      const isCurrent = session.token === currentSessionToken;
                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-4 border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Laptop className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 truncate">
                                  {describeUserAgent(session.userAgent)}
                                </p>
                                {isCurrent && (
                                  <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs">
                                    This device
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {session.ipAddress || "Unknown IP"} · signed in{" "}
                                {formatDate(session.createdAt)}
                              </p>
                            </div>
                          </div>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                              disabled={revokeSessionMutation.isPending}
                              onClick={() =>
                                revokeSessionMutation.mutate(session.token)
                              }
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {(sessionsQuery.data?.length ?? 0) === 0 && (
                      <p className="text-sm text-gray-500 py-4">
                        No active sessions found.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---------------- SECURITY CARD ---------------- */}
          <Card className="border-2 border-gray-300 shadow-sm h-fit">
            <CardHeader className="border-b-2 border-gray-300 bg-primary/10">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-foreground">Security</CardTitle>
                  <CardDescription>
                    Passkeys and two-factor authentication
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              <PasskeysCard />

              <Separator className="bg-gray-300" />

              {/* Two-Factor Authentication */}
              <TwoFactorSettings enabled={twoFactorEnabled} />

              <Separator className="bg-gray-300" />

              {/* Sign Out */}
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
