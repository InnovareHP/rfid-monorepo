import { authClient } from "@/lib/auth-client";
import { uploadImage } from "@/services/image/image-service";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Input } from "@dashboard/ui/components/input";
import { cn } from "@dashboard/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Camera, Check, CheckCircle2, Loader2, Pencil, ShieldCheck, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StatTile } from "./section-card";

type ProfileTabProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled: boolean;
  memberSince?: string | Date | null;
  sessionCount: number;
};

const initials = (name?: string | null) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export function ProfileTab({
  name,
  email,
  image,
  emailVerified,
  twoFactorEnabled,
  memberSince,
  sessionCount,
}: ProfileTabProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name ?? "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateNameMutation = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await authClient.updateUser({ name: value });
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

      const data = await uploadImage(file, "public");
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

  return (
    <>
      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6 sm:flex-nowrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                className="size-16 cursor-pointer"
                onClick={handleAvatarClick}
              >
                {image ? (
                  <AvatarImage
                    src={`${image}?t=${Date.now()}`}
                    alt={name ?? "User"}
                  />
                ) : (
                  <AvatarFallback className="bg-[#2C86D9] text-lg font-semibold text-white">
                    {initials(name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploading}
                aria-label="Change profile photo"
                className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-primary"
              >
                {isUploading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Camera className="size-3" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleProfileImageUpload}
              />
            </div>

            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    className="max-w-64 text-lg font-semibold"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    className="size-9 bg-brand hover:bg-brand/90"
                    disabled={!nameDraft.trim() || updateNameMutation.isPending}
                    onClick={() => updateNameMutation.mutate(nameDraft.trim())}
                    aria-label="Save name"
                  >
                    {updateNameMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9"
                    onClick={() => {
                      setNameDraft(name ?? "");
                      setIsEditingName(false);
                    }}
                    aria-label="Cancel editing name"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {name || "No name set"}
                  </h2>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 text-gray-500"
                    onClick={() => setIsEditingName(true)}
                    aria-label="Edit name"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              )}
              <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          {memberSince ? (
            <div className="text-right">
              <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
                Member Since
              </p>
              <p className="page-title text-2xl font-bold">
                {formatDate(memberSince)}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile label="Email Status">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              emailVerified
                ? "border-green-500 text-green-600"
                : "border-amber-500 text-amber-600"
            )}
          >
            <CheckCircle2 className="size-3.5" />
            {emailVerified ? "Verified" : "Not Verified"}
          </span>
        </StatTile>

        <StatTile label="Two-Factor Authentication">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              twoFactorEnabled
                ? "border-green-500 text-green-600"
                : "border-gray-300 text-gray-500"
            )}
          >
            <ShieldCheck className="size-3.5" />
            {twoFactorEnabled ? "Enabled" : "Not Enabled"}
          </span>
        </StatTile>

        <StatTile label="Active Sessions">
          <p className="page-title text-2xl font-bold">{sessionCount}</p>
        </StatTile>
      </div>
    </>
  );
}
